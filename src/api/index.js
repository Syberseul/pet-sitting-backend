// api/index.js
const express = require("express");
const app = express();

// 1. 强制记录所有请求
app.use((req, res, next) => {
  console.log("===== 请求到达 =====");
  console.log("方法:", req.method);
  console.log("路径:", req.url);
  console.log("Origin:", req.headers.origin);
  next();
});

// 2. 强制允许所有跨域（仅调试用）
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

// 3. 你的业务路由
app.get("/api", (req, res) => {
  res.json({ message: "Hello from Vercel!" });
});

// 4. 导出为 Vercel Serverless Function
module.exports = app;
