const express = require("express");
const router = express.Router();

const userRouter = require("./userRouter");
const dogRouter = require("./dogRouter");

router.use("/users", userRouter);
router.use("/dogs", dogRouter);

const wxValidationContent = "80954e3d9f517a44a6173939ffa17a55";
router.get("/Q3aVw9J6cN.txt", (req, res) => {
  res.status(200).send(wxValidationContent);
});

module.exports = router;
