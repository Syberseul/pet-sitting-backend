const express = require("express");
const router = express.Router();

const { verifyToken } = require("../utils/jwt");

const dogController = require("../controller/dogController");

router.get("/getDogLog/:id", verifyToken, dogController.getDogLog);
router.get("/getAllDogLogs", verifyToken, dogController.getAllLogs);

router.post("/createDogLog", verifyToken, dogController.createDogLog);

router.put("/updateDogLog/:id", verifyToken, dogController.updateDogLog);

module.exports = router;
