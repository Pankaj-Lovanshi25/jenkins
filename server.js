

const express = require("express");
const app = express();

app.get("/test", (req, res) => {
  res.send("server is runing  at port 5003");
});

app.get("/test2" ,(req , res)=>{
  res.send("test 2 is working fine")
})

app.listen(5003, () => {
  console.log("Server running on 5003");
});

setInterval(() => {
  console.log("alive");
}, 10000);
