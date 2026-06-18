const fs = require("fs");

function countLinesSlowly(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let lineCount = 0;

  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") {
      lineCount++;
    }
  }

  return lineCount + 1;
}

function findRepeatedWords(text) {
  const words = text.split(/\s+/);
  const result = [];

  for (let i = 0; i < words.length; i++) {
    for (let j = 0; j < words.length; j++) {
      if (i !== j && words[i] === words[j] && !result.includes(words[i])) {
        result.push(words[i]);
      }
    }
  }

  return result;
}

module.exports = {
  countLinesSlowly,
  findRepeatedWords
};
