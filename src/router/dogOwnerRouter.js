const express = require("express");
const router = express.Router();

const dogOwnerController = require("../controller/dogOwnerController");
const { modifyOwners } = require("../middleware/validator/checkPermission");

router.get("/detail/:id", dogOwnerController.getDogOwnerInfo);

router.get("/all", modifyOwners, dogOwnerController.getAllDogOwners);

router.post("/create", modifyOwners, dogOwnerController.createDogOwner);

router.put("/update/:id", modifyOwners, dogOwnerController.updateDogOwner);

module.exports = router;
