const express = require("express");
const router = express.Router();

const userRouter = require("./userRouter");
const dogRouter = require("./dogRouter");
const dogOwnerRouter = require("./dogOwnerRouter");
const tourRouter = require("./tourRouter");

const { verifyToken } = require("../utils/jwt");

const { checkModifyDog } = require("../middleware/validator/checkPermission");

router.use("/users", userRouter);
router.use("/owner", verifyToken, dogOwnerRouter);
router.use("/dogs", verifyToken, checkModifyDog, dogRouter);
router.use("/tour", verifyToken, tourRouter);

const wxValidationContent = "80954e3d9f517a44a6173939ffa17a55";
router.get("/Q3aVw9J6cN.txt", (req, res) => {
  res.status(200).send(wxValidationContent);
});

module.exports = router;
