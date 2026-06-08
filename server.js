

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5006");
});

app.get("/test2" ,(req , res)=>{
  console.log("test 2 is working fine")
  res.send("test 2 is working fine")
})

app.get("/home", (req, res)=>{
  res.send("welcome to home ")
})


app.get("/about", (req, res)=>{
  res.send("welcome to about page of server 5006")
})

app.listen(5006, () => {
  console.log("Server running on 5006");
});

setInterval(() => {
  console.log("alive");
}, 10000);
