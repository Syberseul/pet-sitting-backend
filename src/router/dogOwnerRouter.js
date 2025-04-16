const express = require("express");
const router = express.Router();

const dogOwnerController = require("../controller/dogOwnerController");

router.post("/create", dogOwnerController.createDogOwner);

router.put("/update/:id", dogOwnerController.updateDogOwner);

router.get("/detail/:id", dogOwnerController.getDogOwnerInfo);

router.get("/all", dogOwnerController.getAllDogOwners);

module.exports = router;
