const express = require("express");
const router = express.Router();

const { verifyToken } = require("../utils/jwt");

const userController = require("../controller/userController");
const dogController = require("../controller/dogController");

router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/refreshToken", userController.refreshToken);

router.post("/createDogLog", verifyToken, dogController.createDogLog);
router.get("/getDogLog/:id", verifyToken, dogController.getDogLog);
router.put("/updateDogLog/:id", verifyToken, dogController.updateDogLog);

module.exports = router;
