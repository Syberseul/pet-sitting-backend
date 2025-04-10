const express = require("express");
const router = express.Router();

const { verifyToken } = require("../utils/jwt");

const dogController = require("../controller/dogController");
const { modifyDogs } = require("../middleware/validator/checkPermission");

router.get("/getDogLog/:id", verifyToken, modifyDogs, dogController.getDogLog);
router.get("/getAllDogLogs", verifyToken, modifyDogs, dogController.getAllLogs);

router.post(
  "/createDogLog",
  verifyToken,
  modifyDogs,
  dogController.createDogLog
);

router.put(
  "/updateDogLog/:id",
  verifyToken,
  modifyDogs,
  dogController.updateDogLog
);

module.exports = router;
