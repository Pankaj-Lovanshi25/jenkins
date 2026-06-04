console.log("Hello jenkins")
console.log("hello ")
console.log("webhook test 2")
console.log("webhook test 3")


const express = require("express");
const app = express();

const port = 5001;
app.get("/test", (req, res) => {
  res.send("Server Running on local system");
});

app.listen(port, () => {
  console.log(`Server1 is running on port ${port}`);
});


