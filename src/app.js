const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(express.json());

app.use("/", require("./router/index"));

const allowedOrigins = [
  "http://localhost:5173", // 本地开发前端
  "https://pet-sitting-family.vercel.app", // 生产前端
];

app.use(
  cors({
    origin: function (origin, callback) {
      // 允许无来源的请求（如 Postman、服务器间调用）
      if (!origin) return callback(null, true);

      // 检查域名是否在白名单中
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 不在白名单中则拒绝
      return callback(new Error(`CORS 阻止了来自 ${origin} 的请求`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 允许的 HTTP 方法
    allowedHeaders: ["Content-Type", "Authorization"], // 允许的请求头
    credentials: true, // 允许发送 Cookie
    maxAge: 86400, // 预检请求缓存时间（秒）
  })
);

// 显式处理 OPTIONS 预检请求
app.options("*", cors());

app.use((req, res, next) => {
  next(createError(404));
});

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
