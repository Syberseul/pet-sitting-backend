const express = require("express");
const router = express.Router();

const dogController = require("../controller/dogController");

router.get("/getDogLog/:id", dogController.getDogLog);
router.get("/getAllDogLogs", dogController.getAllLogs);

router.post("/createDogLog", dogController.createDogLog);

router.put("/updateDogLog/:id", dogController.updateDogLog);

router.delete("/removeDogLog/:id", dogController.removeDogLog);

module.exports = router;
