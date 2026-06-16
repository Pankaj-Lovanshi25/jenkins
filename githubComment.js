const axios = require("axios");
const fs = require("fs");
const path = require("path");

const token = process.env.GITHUB_TOKEN;
const repoOwner = process.env.GITHUB_OWNER;
const repoName = process.env.GITHUB_REPO;
const prNumber = process.env.CHANGE_ID;
const reviewPath = path.join(__dirname, "review.txt");

async function postComment() {
  if (!prNumber) {
    console.log("No PR detected.");
    return;
  }

  if (!fs.existsSync(reviewPath)) {
    throw new Error(
      "review.txt was not generated, so there is nothing to post as a PR comment."
    );
  }

  const review = fs.readFileSync(reviewPath, "utf8").trim();

  if (!review) {
    throw new Error("review.txt is empty, so the PR comment was skipped.");
  }

  const url = `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`;

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

  console.log("Comment posted successfully");
}

postComment().catch((error) => {
  console.error("Failed to post PR comment:");
  console.error(error.response?.data || error.message);
  process.exitCode = 1;
});
