
const fs = require("fs");
const  path = require("path")
const axios = require("axios");
require("dotenv").config();

const filepath = path.join(__dirname,  "server.js");
const code = fs.readFileSync(filepath, "utf-8");

async function reviewCode(){
    try{
        const response = await axios.post("https://api.groq.com/openai/v1/chat/completions",{
            model: "llama-3.3-70b-versatile",
            messages:[
                {
                    role: "system",
                    content:
                    "You are a code reviewer. Find bugs, errors, security issues, and optimization opportunities. Return output in this format: File, Line, Issue, Why It Is Wrong, Solution, Optimization, Severity."
                },
                {
                    role: "user",
                    content: `Review the following code carefully and identify any incorrect snippets, bugs, and improvements:\n\n${code}`
                }
            ],
            temperature: 0.2,
        },
        {
            headers:{
                Authorization: `Bearer  ${process.env.GROQ_API_KEY}`,
                "content-type":  "application/json"
            }
        }
    );
    console.log("===AI CODE REVIEW REPORT===");
    console.log(response.data.choices[0].message.content)
    process.exit(0);
    }
    catch(err){
        console.error("AI review failed:");
        console.error(err.response?.data || err.message);
        process.exit(1);

    }
}

reviewCode();