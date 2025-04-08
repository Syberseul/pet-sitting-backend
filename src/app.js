const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", require("./router/index"));

app.use(
  cors({
    origin: ["http://localhost:5173/"],
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
