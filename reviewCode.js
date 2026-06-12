
// const fs = require("fs");
// const  path = require("path")
// const axios = require("axios");
// require("dotenv").config();

// const filepath = path.join(__dirname,  "server.js");
// const code = fs.readFileSync(filepath, "utf-8");

// async function reviewCode(){
//     try{
//         const response = await axios.post("https://api.groq.com/openai/v1/chat/completions",{
//             model: "llama-3.3-70b-versatile",
//             messages:[
//                 {
//                     role: "system",
//                     content:
//                     "You are a code reviewer. Find bugs, errors, security issues, and optimization opportunities. Return output in this format: File, Line, Issue, Why It Is Wrong, Solution, Optimization, Severity."
//                 },
//                 {
//                     role: "user",
//                     content: `Review the following code carefully and identify any incorrect snippets, bugs, and improvements:\n\n${code}`
//                 }
//             ],
//             temperature: 0.2,
//         },
//         {
//             headers:{
//                 Authorization: `Bearer  ${process.env.GROQ_API_KEY}`,
//                 "content-type":  "application/json"
//             }
//         }
//     );
//     console.log("===AI CODE REVIEW REPORT===");
//     console.log(response.data.choices[0].message.content)
//     process.exit(0);
//     }
//     catch(err){
//         console.error("AI review failed:");
//         console.error(err.response?.data || err.message);
//         process.exit(1);

//     }
// }

// reviewCode();




// const fs = require("fs");
// const path = require("path");
// const { execSync } = require("child_process");
// const axios = require("axios");
// require("dotenv").config({ path: path.join(__dirname, ".env") });

// const GROQ_API_KEY = process.env.GROQ_API_KEY;
// const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
// const FALLBACK_FILES = ["Jenkinsfile", "server.js", "reviewCode.js", "package.json", "README.md"];
// console.log("API Key Found:", !!process.env.GROQ_API_KEY);
// function runGit(command) {
//   return execSync(command, {
//     cwd: __dirname,
//     encoding: "utf8",
//     stdio: ["ignore", "pipe", "pipe"],
//     maxBuffer: 10 * 1024 * 1024
//   }).trim();
// }

// function getDiffRange() {
//   if (process.env.CHANGE_ID) {
//     const targetBranch = process.env.CHANGE_TARGET || "main";
//     return `origin/${targetBranch}...HEAD`;
//   }

//   return "HEAD~1..HEAD";
// }

// function getChangedFiles() {
//   const commands = [
//     `git diff --name-only --diff-filter=ACMRT ${getDiffRange()} -- .`,
//     "git diff --name-only --diff-filter=ACMRT -- ."
//   ];

//   for (const command of commands) {
//     try {
//       const output = runGit(command);
//       if (output) {
//         return output
//           .split(/\r?\n/)
//           .map((file) => file.trim())
//           .filter(Boolean);
//       }
//     } catch (error) {
//       // Try the next fallback command.
//     }
//   }

//   return FALLBACK_FILES.filter((file) => fs.existsSync(path.join(__dirname, file)));
// }

// function readFilesWithLineNumbers(files) {
//   return files
//     .map((file) => {
//       const fullPath = path.join(__dirname, file);
//       const content = fs.readFileSync(fullPath, "utf8");
//       const numberedContent = content
//         .split(/\r?\n/)
//         .map((line, index) => `${index + 1}: ${line}`)
//         .join("\n");

//       return `FILE: ${file}\n${numberedContent}`;
//     })
//     .join("\n\n---\n\n");
// }

// async function reviewCode() {
//   if (!GROQ_API_KEY) {
//     console.log("GROQ_API_KEY is missing. Skipping AI review.");
//     return;
//   }

//   const filesToReview = getChangedFiles();
//   const reviewInput = readFilesWithLineNumbers(filesToReview);

//   const response = await axios.post(
//     "https://api.groq.com/openai/v1/chat/completions",
//     {
//       model: GROQ_MODEL,
//       temperature: 0.2,
//       messages: [
//         {
//           role: "system",
//           content:
//             "You are a senior Jenkins and Node.js code reviewer. Find bugs, incorrect snippets, security issues, build problems, and optimization opportunities. For each finding, include File, Line, Issue, Why It Is Wrong, Solution, Optimization, and Severity. If no issue exists, say that clearly."
//         },
//         {
//           role: "user",
//           content: `Review the following PR/build changes carefully. Focus on exact line references and give practical fixes:\n\n${reviewInput}`
//         }
//       ]
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${GROQ_API_KEY}`,
//         "Content-Type": "application/json"
//       }
//     }
//   );

//   console.log("\n=== AI CODE REVIEW REPORT ===\n");
//   console.log(response.data.choices[0].message.content);
// }

// reviewCode().catch((error) => {
//   console.error("AI review failed:");
//   console.error(error.response?.data || error.message);
//   process.exitCode = 1;
// });


const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const axios = require("axios");

require("dotenv").config({
  path: path.join(__dirname, ".env")
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL =
  process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const FALLBACK_FILES = [
  "Jenkinsfile",
  "server.js",
  "reviewCode.js",
  "package.json",
  "README.md"
];

console.log("API Key Found:", !!process.env.GROQ_API_KEY);

function runGit(command) {
  return execSync(command, {
    cwd: __dirname,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  }).trim();
}

function getDiffRange() {
  if (process.env.CHANGE_ID) {
    const targetBranch = process.env.CHANGE_TARGET || "main";
    return `origin/${targetBranch}...HEAD`;
  }

  return "HEAD~1..HEAD";
}

function getChangedFiles() {
  const commands = [
    `git diff --name-only --diff-filter=ACMRT ${getDiffRange()} -- .`,
    "git diff --name-only --diff-filter=ACMRT -- ."
  ];

  for (const command of commands) {
    try {
      const output = runGit(command);

      if (output) {
        return output
          .split(/\r?\n/)
          .map((file) => file.trim())
          .filter(Boolean);
      }
    } catch (error) {
      // Try next command
    }
  }

  return FALLBACK_FILES.filter((file) =>
    fs.existsSync(path.join(__dirname, file))
  );
}

function readFilesWithLineNumbers(files) {
  return files
    .map((file) => {
      const fullPath = path.join(__dirname, file);

      const content = fs.readFileSync(
        fullPath,
        "utf8"
      );

      const numberedContent = content
        .split(/\r?\n/)
        .map(
          (line, index) =>
            `${index + 1}: ${line}`
        )
        .join("\n");

      return `FILE: ${file}\n${numberedContent}`;
    })
    .join("\n\n---\n\n");
}

async function reviewCode() {
  if (!GROQ_API_KEY) {
    console.log(
      "GROQ_API_KEY is missing. Skipping AI review."
    );
    return;
  }

  const filesToReview = getChangedFiles();

  console.log(
    "\nChanged Files:",
    filesToReview
  );

  const reviewInput =
    readFilesWithLineNumbers(filesToReview);

  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a senior Jenkins and Node.js code reviewer. Find bugs, incorrect snippets, security issues, build problems, and optimization opportunities. For each finding, include File, Line, Issue, Why It Is Wrong, Solution, Optimization, and Severity. If no issue exists, say that clearly."
        },
        {
          role: "user",
          content: `Review the following PR/build changes carefully. Focus on exact line references and give practical fixes:\n\n${reviewInput}`
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
    response.data.choices[0].message.content;

  console.log(
    "\n=== AI CODE REVIEW REPORT ===\n"
  );

  console.log(review);

  // Save review into file
  const reportPath = path.join(
    __dirname,
    "ai-review-report.md"
  );

  const reportContent = `
# AI Code Review Report

Generated At: ${new Date().toLocaleString()}

---

${review}
`;

  fs.writeFileSync(
    reportPath,
    reportContent,
    "utf8"
  );

  console.log(
    `\nReview saved successfully: ${reportPath}`
  );
}

reviewCode().catch((error) => {
  console.error("\nAI review failed:");

  console.error(
    error.response?.data || error.message
  );

  process.exitCode = 1;
});

