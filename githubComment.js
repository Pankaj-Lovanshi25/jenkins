const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const token = process.env.GITHUB_TOKEN;
const repoOwner = process.env.GITHUB_OWNER;
const repoName = process.env.GITHUB_REPO;
const prNumber = process.env.CHANGE_ID;
const branchName = process.env.BRANCH_NAME || process.env.GIT_BRANCH || "";
const reviewPath = path.join(__dirname, "review.txt");

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
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function getHeadCommit() {
  try {
    return runGit("git rev-parse HEAD");
  } catch (error) {
    return "";
  }
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

async function postComment() {
  assertRequiredConfig();
  await validateGithubToken();

  if (!fs.existsSync(reviewPath)) {
    throw new Error(
      "review.txt was not generated, so there is nothing to post as a PR comment."
    );
  }

  const review = fs.readFileSync(reviewPath, "utf8").trim();

  if (!review) {
    throw new Error("review.txt is empty, so the PR comment was skipped.");
  }

  const openPrNumber = prNumber || (await findOpenPrNumber());

  if (openPrNumber) {
    const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${openPrNumber}/comments`;

    await axios.post(
      url,
      {
        body: review
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    console.log(`Comment posted successfully on PR #${openPrNumber}`);
    return;
  }

  const commitSha = getHeadCommit();

  if (!commitSha) {
    throw new Error("Could not determine the current commit SHA.");
  }

  await axios.post(
    `https://api.github.com/repos/${repoOwner}/${repoName}/commits/${commitSha}/comments`,
    {
      body: `AI review for branch ${branchName || "unknown"}:\n\n${review}`
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );

  console.log(`No open PR found. Commit comment posted on ${commitSha}`);
}

postComment().catch((error) => {
  console.error("Failed to post PR comment:");
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
