

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5002");
});

app.get("/test2" ,(req , res)=>{
  res.send("test 2 is working fine")
})

app.listen(5002, () => {
  console.log("Server running on 5002");
});

setInterval(() => {
  console.log("alive");
}, 10000);
