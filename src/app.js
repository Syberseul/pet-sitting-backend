const express = require("express");
const cors = require("cors");
const createError = require("http-errors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/", require("./router/index"));

app.use((req, res, next) => {
  next(createError(404));
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running...`);
  });
}

module.exports = app;
