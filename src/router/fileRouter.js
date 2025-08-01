const express = require("express");
const router = express.Router();

const fileController = require("../controller/fileController");

const { checkModifyDog } = require("../middleware/validator/checkPermission");

const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, callback) => {
    if (file.mimetype.startsWith("image/")) callback(null, true);
    else callback(new Error("Invalid file type"), false);
  },
  limits: { fieldSize: 1 * 1024 * 1024 }, // 1MB limitation
});

router.post(
  "/uploadFile/dogImg/:dogId",
  checkModifyDog,
  upload.single("image"),
  fileController.uploadDogFile
);

module.exports = router;
