const axios = require("axios");
const fs = require("fs");

const token = process.env.GITHUB_TOKEN;

const repoOwner = process.env.GITHUB_OWNER;
const repoName = process.env.GITHUB_REPO;

const prNumber = process.env.CHANGE_ID;

async function postComment() {

  if (!prNumber) {
    console.log("No PR detected.");
    return;
  }

  const review = fs.readFileSync(
    "review.txt",
    "utf8"
  );

  const url =
    `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments`;

  const response = await axios.post(
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

postComment().catch(console.error);