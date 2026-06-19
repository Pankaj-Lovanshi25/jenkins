const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");

const app = express();
const PORT = process.env.PORT || 5005;
const HOST = process.env.HOST || "0.0.0.0";


app.get("/test2", (req, res) => {
  console.log("test 2 is working fine");
  res.send("test 2 is working fine");
});



app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
