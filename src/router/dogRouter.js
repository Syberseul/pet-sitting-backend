const express = require("express");
const router = express.Router();

const dogController = require("../controller/dogController");

router.post("/createDog", dogController.createDog);

router.put("/updateDog", dogController.updateDog);

router.delete("/removeDog", dogController.removeDog);

module.exports = router;
