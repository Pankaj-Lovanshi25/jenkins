const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const REVIEW_OUTPUT_PATH = path.join(__dirname, "review.txt");
const REVIEW_REPORT_PATH = path.join(__dirname, "ai-review-report.md");
const MAX_PROMPT_CHARS = 50000;
const SYNTAX_CHECKABLE_EXTENSIONS = new Set([".js", ".cjs", ".mjs", ".jsx"]);

function runGit(command) {
  return execSync(command, {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  }).trim();
}

function isPullRequestBuild() {
  return Boolean(process.env.CHANGE_ID);
}

function getBranchName() {
  return process.env.BRANCH_NAME || process.env.GIT_BRANCH || "";
}

function getTargetBranch() {
  return process.env.CHANGE_TARGET || "main";
}

function ensureTargetBranchAvailable() {
  const targetBranch = getTargetBranch();
  const localRef = `refs/remotes/origin/${targetBranch}`;

  try {
    runGit(`git show-ref --verify --quiet ${localRef}`);
    console.log(`Target branch ${targetBranch} is already available locally.`);
    return;
  } catch (error) {
    // Fall through and try a targeted fetch.
  }

  try {
    runGit(
      `git fetch --no-tags origin +refs/heads/${targetBranch}:${localRef} --depth=1`
    );
  } catch (error) {
    console.warn(
      `Warning: could not fetch origin/${targetBranch}. Using the local checkout only.`
    );
  }
}

function getDiffRangeCandidates() {
  const targetBranch = getTargetBranch();
  return [
    `origin/${targetBranch}...HEAD`,
    `${targetBranch}...HEAD`,
    "HEAD~1..HEAD"
  ];
}

function getDiffRange() {
  for (const candidate of getDiffRangeCandidates()) {
    try {
      runGit(`git diff --name-only --diff-filter=ACMRT ${candidate} -- .`);
      return candidate;
    } catch (error) {
      // Try the next candidate.
    }
  }

  throw new Error(
    `Unable to resolve a git diff range for branch ${getBranchName() || "unknown"}.`
  );
}

function getHeadCommit() {
  return runGit("git rev-parse HEAD");
}

function isSyntaxCheckableFile(file) {
  return SYNTAX_CHECKABLE_EXTENSIONS.has(path.extname(file).toLowerCase());
}

function runNodeSyntaxCheck(fullPath) {
  try {
    execSync(`node --check "${fullPath}"`, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024
    });
    return null;
  } catch (error) {
    const output = `${error.stderr || ""}${error.stdout || ""}${error.message || ""}`;
    return output.trim();
  }
}

function parseNodeSyntaxError(output, fallbackFile) {
  if (!output) {
    return null;
  }

  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const messageLine = [...lines].reverse().find((line) =>
    /^SyntaxError:|^Error:/.test(line)
  );

  const locationLine = lines.find((line) => line.includes(fallbackFile)) || lines[0] || "";
  const match = locationLine.match(/^(.*?):(\d+)(?::(\d+))?/);
  const lineNumber = match ? Number.parseInt(match[2], 10) : 1;
  const message = messageLine
    ? messageLine.replace(/^SyntaxError:\s*/i, "").replace(/^Error:\s*/i, "")
    : "Syntax check failed.";

  if (!Number.isInteger(lineNumber) || lineNumber <= 0) {
    return null;
  }

  return {
    line: lineNumber,
    message
  };
}

function collectSyntaxFindings(files) {
  const findings = [];

  for (const file of files) {
    if (!isSyntaxCheckableFile(file)) {
      continue;
    }

    const fullPath = path.join(__dirname, file);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const output = runNodeSyntaxCheck(fullPath);
    const parsed = parseNodeSyntaxError(output, file);

    if (!parsed) {
      continue;
    }

    findings.push({
      path: file,
      line: parsed.line,
      side: "RIGHT",
      body: `Syntax error: ${parsed.message} Fix this line before merging.`,
      severity: "high"
    });
  }

  return findings;
}

function getChangedFiles() {
  const diffRange = getDiffRange();
  const output = runGit(
    `git diff --name-only --diff-filter=ACMRT ${diffRange} -- .`
  );

  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function getDiffPreview(files) {
  if (files.length === 0) {
    return "";
  }

  const diffRange = getDiffRange();
  const quotedFiles = files.map((file) => `"${file}"`).join(" ");
  return runGit(
    `git diff --no-color --unified=3 ${diffRange} -- ${quotedFiles}`
  );
}

function readFilesWithLineNumbers(files) {
  return files
    .map((file) => {
      const fullPath = path.join(__dirname, file);

      if (!fs.existsSync(fullPath)) {
        return `FILE: ${file}\n[File missing from workspace checkout]`;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const numberedContent = content
        .split(/\r?\n/)
        .map((line, index) => `${index + 1}: ${line}`)
        .join("\n");

      return `FILE: ${file}\n${numberedContent}`;
    })
    .join("\n\n---\n\n");
}

function truncateForPrompt(text, limit = MAX_PROMPT_CHARS) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit)}\n\n[TRUNCATED: prompt exceeded ${limit} characters]`;
}

function buildReviewInstructions() {
  return [
    "Review only the changed files and changed hunks included in this prompt.",
    "Do not review unchanged code or invent missing context.",
    "Focus on syntax errors, security issues, best-practice problems, build/runtime regressions, and code-quality issues.",
    "When you find a syntax issue, write the comment as a direct fix instruction for that exact line.",
    "Return valid JSON only. Do not wrap the response in markdown or code fences.",
    'Use this exact schema: {"summary":"string","comments":[{"path":"relative/file.js","line":10,"side":"RIGHT","body":"string","severity":"low|medium|high"}]}',
    "Only include comments for lines that appear in the provided changed files and diffs.",
    "Use side RIGHT for every comment unless you are sure the line is on the deleted side of the diff.",
    'If there are no issues, return {"summary":"No issues found.","comments":[]}.',
    "Keep each comment body short, specific, and practical."
  ].join(" ");
}

function buildPrompt(files, diffPreview) {
  const snapshots = readFilesWithLineNumbers(files);
  const combinedReviewInput = [
    `REVIEW SCOPE: Only review the changed files and changed hunks shown below. Ignore unchanged code.`,
    `REVIEW RULES: ${buildReviewInstructions()}`,
    `BUILD TYPE: ${isPullRequestBuild() ? "pull_request" : "branch_push"}`,
    `BRANCH NAME: ${getBranchName() || "unknown"}`,
    `HEAD COMMIT: ${getHeadCommit()}`,
    `TARGET BRANCH: ${isPullRequestBuild() ? getTargetBranch() : "main"}`,
    diffPreview ? `GIT DIFF PREVIEW:\n${diffPreview}` : "GIT DIFF PREVIEW: [empty]",
    `FILE SNAPSHOT WITH LINE NUMBERS:\n${snapshots}`,
    "Output only JSON that matches the requested schema."
  ].join("\n\n---\n\n");

  return truncateForPrompt(combinedReviewInput);
}

function extractJsonPayload(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Try fenced code blocks or a JSON object embedded in text.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("AI response did not contain valid JSON.");
}

function normalizeReviewData(value) {
  const source = Array.isArray(value) ? { comments: value } : value || {};
  const comments = Array.isArray(source.comments) ? source.comments : [];

  return {
    summary:
      typeof source.summary === "string" && source.summary.trim()
        ? source.summary.trim()
        : "AI review completed.",
    comments: comments
      .map((comment) => ({
        path: typeof comment.path === "string" ? comment.path.trim() : "",
        line: Number.parseInt(comment.line, 10),
        side:
          comment.side === "LEFT"
            ? "LEFT"
            : comment.side === "RIGHT"
              ? "RIGHT"
              : "RIGHT",
        body: typeof comment.body === "string" ? comment.body.trim() : "",
        severity:
          typeof comment.severity === "string" && comment.severity.trim()
            ? comment.severity.trim()
            : "medium"
      }))
      .filter(
        (comment) =>
          comment.path &&
          Number.isInteger(comment.line) &&
          comment.line > 0 &&
          comment.body
      )
  };
}

function formatMarkdownReport(review) {
  const lines = [
    "# AI Code Review",
    "",
    review.summary || "No issues found."
  ];

  if (review.comments.length === 0) {
    lines.push("", "No inline findings were generated.");
    return lines.join("\n");
  }

  lines.push("", "## Inline Findings");

  review.comments.forEach((comment, index) => {
    lines.push(
      "",
      `${index + 1}. **${comment.path}:${comment.line}** (${comment.side}, ${comment.severity})`,
      `   ${comment.body}`
    );
  });

  return lines.join("\n");
}

function writeReviewOutput(review) {
  const rawJson = JSON.stringify(review, null, 2);
  fs.writeFileSync(REVIEW_OUTPUT_PATH, rawJson, "utf8");
  fs.writeFileSync(REVIEW_REPORT_PATH, formatMarkdownReport(review), "utf8");
}

async function reviewCode() {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Configure it in Jenkins credentials so the PR review can run."
    );
  }

  ensureTargetBranchAvailable();

  const filesToReview = getChangedFiles();
  const syntaxFindings = collectSyntaxFindings(filesToReview);

  if (filesToReview.length === 0) {
    const emptyReview =
      "No changed files were detected for this PR/build, so there is nothing to review.";
    writeReviewOutput({
      summary: emptyReview,
      comments: []
    });
    console.log(emptyReview);
    return;
  }

  const diffPreview = getDiffPreview(filesToReview);
  const prompt = buildPrompt(filesToReview, diffPreview);

  console.log("\n=== CHANGED FILES ===\n");
  console.log(filesToReview.join("\n"));

  console.log("\n=== CHANGED DIFF PREVIEW (+ / -) ===\n");
  console.log(diffPreview || "No diff preview available.");

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a senior Jenkins and Node.js code reviewer. Review only the changed code in the provided PR diff. Return strict JSON matching the requested schema and include inline findings only when you are confident about the file and line number."
        },
        {
          role: "user",
          content: `Review this PR carefully and give practical fixes in unified diff style when possible:\n\n${prompt}`
        }
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const parsedReview =
    response.data?.choices?.[0]?.message?.content?.trim() || "";
  let review;

  try {
    review = normalizeReviewData(extractJsonPayload(parsedReview || "{}"));
  } catch (error) {
    console.warn(
      "AI response was not valid JSON. Falling back to a general review summary."
    );
    review = {
      summary: parsedReview || "AI review returned an empty response.",
      comments: []
    };
  }

  if (syntaxFindings.length > 0) {
    const seen = new Set(
      review.comments.map(
        (comment) => `${comment.path}:${comment.line}:${comment.body}`
      )
    );
    for (const finding of syntaxFindings) {
      const key = `${finding.path}:${finding.line}:${finding.body}`;
      if (!seen.has(key)) {
        review.comments.unshift(finding);
        seen.add(key);
      }
    }
    review.summary =
      review.summary || "AI review completed with syntax findings detected locally.";
  }

  console.log("\n=== AI CODE REVIEW REPORT ===\n");
  console.log(review.summary);
  console.log(`Inline findings: ${review.comments.length}`);

  writeReviewOutput(review);
}

reviewCode().catch((error) => {
  console.error("AI review failed:");
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
