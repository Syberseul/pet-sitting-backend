const express = require("express");
const router = express.Router();

const userRouter = require("./userRouter");
const dogRouter = require("./dogRouter");

router.use("/users", userRouter);
router.use("/dogs", dogRouter);

module.exports = router;
