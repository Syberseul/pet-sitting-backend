const express = require("express");
const router = express.Router();

const dogController = require("../controller/dogController");

const { checkModifyDog } = require("../middleware/validator/checkPermission");

router.post("/createDog", checkModifyDog, dogController.createDog);

router.put("/updateDog", checkModifyDog, dogController.updateDog);

router.delete("/removeDog", checkModifyDog, dogController.removeDog);

module.exports = router;
