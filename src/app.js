const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(express.json());

// 动态设置允许的 Origin（避免硬编码）
const allowedOrigins = [
  "https://pet-sitting-family.vercel.app",
  "http://localhost:5173",
  // 添加其他可能的域名（如后端部署后的 URL）
];

app.use(
  cors({
    origin: function (origin, callback) {
      // 允许没有 Origin 的请求（如 Postman、curl）
      if (!origin) return callback(null, true);

      // 检查是否在允许列表中
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // 如果需要跨域传递 Cookie
  })
);

// 显式处理 OPTIONS 请求（确保预检通过）
app.options("*", cors());

// 路由
app.use("/", require("./router/index"));

// 404 处理
app.use((req, res, next) => {
  next(createError(404));
});

// 本地开发启动
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
