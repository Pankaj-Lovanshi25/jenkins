console.log("Hello jenkins")
console.log("hello ")
console.log("webhook test 2")
console.log("webhook test 3")


const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5002");
});

app.listen(5002, () => {
  console.log("Server running on 5002");
});

setInterval(() => {
  console.log("alive");
}, 10000);
