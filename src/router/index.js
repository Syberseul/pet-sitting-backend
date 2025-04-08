const express = require("express");
const router = express.Router();

const { verifyToken } = require("../utils/jwt");

const userController = require("../controller/userController");
const dogController = require("../controller/dogController");

router.post("/register", userController.register);
router.post("/login", userController.login);

router.post("/createDogLog", verifyToken, dogController.createDogLog);

module.exports = router;
