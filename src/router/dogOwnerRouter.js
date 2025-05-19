const express = require("express");
const router = express.Router();

const dogOwnerController = require("../controller/dogOwnerController");

router.get("/detail/:id", dogOwnerController.getDogOwnerInfo);

router.get("/all", dogOwnerController.getAllDogOwners);

router.post("/create", dogOwnerController.createDogOwner);

router.put("/update/:id", dogOwnerController.updateDogOwner);

module.exports = router;
