const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const token = process.env.GITHUB_TOKEN;
const repoOwner = process.env.GITHUB_OWNER;
const repoName = process.env.GITHUB_REPO;
const prNumber = process.env.CHANGE_ID;
const branchName = process.env.BRANCH_NAME || process.env.GIT_BRANCH || "";
const reviewPath = path.join(__dirname, "..", "reports", "review.txt");
const REVIEW_DIFF_CONTEXT = 0;

function assertRequiredConfig() {
  if (!token) {
    throw new Error("GITHUB_TOKEN is missing. Configure it in Jenkins credentials or .env.");
  }

  if (!repoOwner || !repoName) {
    throw new Error(
      "GITHUB_OWNER and GITHUB_REPO are required so the review comment can be posted."
    );
  }
}

async function validateGithubToken() {
  await axios.get("https://api.github.com", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });
}

function runGit(command) {
  return execSync(command, {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function getTargetBranch() {
  return process.env.CHANGE_TARGET || "main";
}

function getHeadCommit() {
  try {
    return runGit("git rev-parse HEAD");
  } catch (error) {
    return "";
  }
}

function getDiffRange() {
  const targetBranch = getTargetBranch();
  return `origin/${targetBranch}...HEAD`;
}

function getUnifiedZeroDiff(files) {
  const quotedFiles = files.map((file) => `"${file}"`).join(" ");
  return runGit(
    `git diff --no-color --unified=${REVIEW_DIFF_CONTEXT} ${getDiffRange()} -- ${quotedFiles}`
  );
}

function buildDiffPositionMap(files) {
  const diffText = getUnifiedZeroDiff(files);
  const lines = diffText.split(/\r?\n/);
  const positions = new Map();

  let currentFile = "";
  let currentPosition = 0;
  let currentNewLine = 0;
  let currentOldLine = 0;

  for (const rawLine of lines) {
    if (rawLine.startsWith("diff --git ")) {
      currentFile = "";
      currentPosition = 0;
      currentNewLine = 0;
      currentOldLine = 0;
      continue;
    }

    const fileMatch = rawLine.match(/^\+\+\+\s+b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    const hunkMatch = rawLine.match(/^@@\s-(\d+)(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/);
    if (hunkMatch) {
      currentOldLine = Number.parseInt(hunkMatch[1], 10);
      currentNewLine = Number.parseInt(hunkMatch[2], 10);
      continue;
    }

    if (!currentFile || !rawLine || rawLine.startsWith("\\ No newline")) {
      continue;
    }

    currentPosition += 1;

    if (rawLine.startsWith("+")) {
      positions.set(`${currentFile}:${currentNewLine}:RIGHT`, currentPosition);
      currentNewLine += 1;
    } else if (rawLine.startsWith("-")) {
      positions.set(`${currentFile}:${currentOldLine}:LEFT`, currentPosition);
      currentOldLine += 1;
    } else {
      currentNewLine += 1;
      currentOldLine += 1;
    }
  }

  return positions;
}

function resolveCommentPosition(positionMap, comment) {
  const key = `${comment.path}:${comment.line}:${comment.side}`;
  return positionMap.get(key) || null;
}

async function findOpenPrNumber() {
  if (!branchName) {
    return null;
  }

  const head = `${repoOwner}:${branchName.replace(/^origin\//, "")}`;
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls?state=open&head=${encodeURIComponent(head)}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    }
  });

  return response.data?.[0]?.number || null;
}

function extractJsonPayload(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Try fenced code blocks or embedded JSON.
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

  throw new Error("review.txt did not contain valid JSON.");
}

function readReviewFile() {
  const raw = fs.readFileSync(reviewPath, "utf8");

  try {
    return normalizeReviewData(extractJsonPayload(raw));
  } catch (error) {
    return {
      summary: raw.trim() || "AI review completed.",
      comments: []
    };
  }
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
        body: typeof comment.body === "string" ? comment.body.trim() : ""
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

function buildFallbackBody(review) {
  const inlineSummary = review.comments.length
    ? review.comments
        .map(
          (comment) =>
            `- ${comment.path}:${comment.line} [${comment.side}] ${comment.body}`
        )
        .join("\n")
    : "No inline findings were generated.";

  return `${review.summary}\n\n${inlineSummary}`;
}

async function postPrComment(openPrNumber, body) {
  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${openPrNumber}/comments`;

  await axios.post(
    url,
    { body },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );
}

async function postInlineReview(openPrNumber, review) {
  const commitSha = getHeadCommit();
  const positionMap = buildDiffPositionMap(
    [...new Set(review.comments.map((comment) => comment.path))]
  );
  const comments = review.comments
    .map((comment) => {
      const position = resolveCommentPosition(positionMap, comment);

      if (!position) {
        return null;
      }

      return {
        path: comment.path,
        position,
        body: comment.body
      };
    })
    .filter(Boolean);

  if (comments.length === 0) {
    throw new Error(
      "No review comments could be mapped to diff positions, so inline posting was skipped."
    );
  }

  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${openPrNumber}/reviews`;

  await axios.post(
    url,
    {
      body: review.summary,
      event: "COMMENT",
      commit_id: commitSha,
      comments
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );
}

async function postComment() {
  assertRequiredConfig();
  await validateGithubToken();

  if (!fs.existsSync(reviewPath)) {
    throw new Error(
      "review.txt was not generated, so there is nothing to post as a PR comment."
    );
  }

  const review = readReviewFile();

  const openPrNumber = prNumber || (await findOpenPrNumber());

  if (!openPrNumber) {
    console.log(
      "No open PR found for this build, so no GitHub comment was posted."
    );
    return;
  }

  if (review.comments.length === 0) {
    await postPrComment(openPrNumber, review.summary);
    console.log(`No inline findings were generated. General PR comment posted on #${openPrNumber}`);
    return;
  }

  try {
    await postInlineReview(openPrNumber, review);
    console.log(`Inline review comments posted successfully on PR #${openPrNumber}`);
  } catch (error) {
    console.warn(
      "Inline review comment posting failed. Falling back to a general PR comment."
    );
    await postPrComment(openPrNumber, buildFallbackBody(review));
    console.error(error.response?.data || error.message);
  }
}

postComment().catch((error) => {
  console.error("Failed to post PR comment:");
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
