const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();

app.use(express.json());

const allowedOrigins = [
  "https://pet-sitting-family.vercel.app",
  "http://localhost:5173",
  "https://backend-pet-sitting-family.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // 允许没有 origin 的请求（如 curl、Postman）
      if (!origin) return callback(null, true);

      // 检查是否在允许列表中，或包含 "vercel.app"（方便测试）
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") // 允许所有 Vercel 预览 URL
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // 允许跨域携带 Cookie
  })
);
// 路由
app.use("/", require("./router/index"));

// 在所有路由之后添加
app.use((err, req, res, next) => {
  console.error("Error Stack:", err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  });
});

// 404处理
app.use((req, res, next) => {
  next(createError(404));
});

// 错误处理（重要：确保错误信息返回给客户端）
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

// 本地开发启动
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
