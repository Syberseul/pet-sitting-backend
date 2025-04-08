const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", require("./router/index"));

const whitelist = [
  "http://localhost:3000", // 本地开发
  "http://localhost:5173", // Vite 默认端口
  "https://pet-sitting-family.vercel.app", // 生产环境前端地址
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

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
