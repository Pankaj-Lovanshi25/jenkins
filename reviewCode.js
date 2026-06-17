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
    "For each finding, include: File, Line, Issue, Why It Is Wrong, and Solution.",
    "If there are no issues, respond with exactly: No issues found.",
    "Keep the response concise and practical."
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
    `FILE SNAPSHOT WITH LINE NUMBERS:\n${snapshots}`
  ].join("\n\n---\n\n");

  return truncateForPrompt(combinedReviewInput);
}

function writeReviewOutput(review) {
  fs.writeFileSync(REVIEW_OUTPUT_PATH, review, "utf8");
  fs.writeFileSync(REVIEW_REPORT_PATH, review, "utf8");
}

async function reviewCode() {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing. Configure it in Jenkins credentials so the PR review can run."
    );
  }

  ensureTargetBranchAvailable();

  const filesToReview = getChangedFiles();

  if (filesToReview.length === 0) {
    const emptyReview =
      "No changed files were detected for this PR/build, so there is nothing to review.";
    writeReviewOutput(emptyReview);
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
            "You are a senior Jenkins and Node.js code reviewer. Review only the changed code in the provided PR diff. Find bugs, incorrect snippets, security issues, build problems, and optimization opportunities. For each finding, include File, Line, Issue, Why It Is Wrong, Solution, Optimization, and Severity. If no issue exists, say that clearly."
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

  const review =
    response.data?.choices?.[0]?.message?.content?.trim() ||
    "AI review returned an empty response.";

  console.log("\n=== AI CODE REVIEW REPORT ===\n");
  console.log(review);

  writeReviewOutput(review);
}

reviewCode().catch((error) => {
  console.error("AI review failed:");
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
