const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");

router.post("/register", userController.register);

router.post("/login", userController.login);

router.post("/refreshToken", userController.refreshToken);

module.exports = router;
