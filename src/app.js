const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: [
      "https://pet-sitting-family.vercel.app",
      "https://backend-pet-sitting-family.vercel.app",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 添加 OPTIONS
    allowedHeaders: ["Content-Type", "Authorization"], // 按需添加
  })
);

app.use("/", require("./router/index"));

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

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
