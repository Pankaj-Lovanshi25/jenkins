console.log("Hello jenkins")
console.log("hello ")
console.log("webhook test 2")
console.log("webhook test 3")


const express = require("express");
const app = express();

const port = 5000;
app.get("/", (req, res) => {
  res.send("Server Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


