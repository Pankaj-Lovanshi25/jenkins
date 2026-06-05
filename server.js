

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5004");
});

app.get("/test2" ,(req , res)=>{
  res.send("test 2 is working fine")
})

app.get("/home", (req, res)=>{
  res.send("welcome to home page of server 5004")
})


app.listen(5004, () => {
  console.log("Server running on 5004");
});

setInterval(() => {
  console.log("alive");
}, 10000);
