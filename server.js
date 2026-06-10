const express = require("express");
const app = express();
const PORT = process.env.PORT || 5005;

app.get("/test", (req, res) => {
  res.status(200).send(`server is running at port ${PORT}`);
});

app.get("/test2", (req, res) => {
  console.log("test 2 is working fine");
  res.send("test 2 is working fine");
});

app.get("/home", (req, res) => {
  res.send("welcome to home page");
});

app.get("/about", (req, res) => {
  res.send("welcome to about page of server 5005");
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
