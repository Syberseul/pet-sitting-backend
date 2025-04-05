const express = require("express");
const router = express.Router();

const testController = require("../controller/testController");
const userController = require("../controller/userController");

router.get("/", testController.test);
router.post("/register", userController.register);

module.exports = router;
