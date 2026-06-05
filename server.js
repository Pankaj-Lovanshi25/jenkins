

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5005");
});

app.get("/test2" ,(req , res)=>{
  res.send("test 2 is working fine")
})

app.get("/home", (req, res)=>{
  res.send("welcome to home page of server 5005")
})


app.get("/about", (req, res)=>{
  res.send("welcome to about page of server 5005")
})

app.listen(5005, () => {
  console.log("Server running on 5005");
});

setInterval(() => {
  console.log("alive");
}, 10000);
