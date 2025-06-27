const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");

const {
  checkGetAllUsers,
  updateUserInfo,
} = require("../middleware/validator/checkPermission");

router.get("/all", checkGetAllUsers, userController.getAllUsers);

router.post("/register", userController.register);

router.post("/login", userController.login);

router.post("/logout", userController.logout);

router.post("/refreshToken", userController.refreshToken);

router.post("/mapUsers", checkGetAllUsers, userController.mapUsers);

router.put(
  "/updateUserRole/:id/:role",
  checkGetAllUsers,
  userController.updateUserRole
);

router.put(
  "/toggleUserReceiveNotification/:id/:receiveNotification",
  checkGetAllUsers,
  userController.toggleUserReceiveNotification
);

router.put("/updateUser/:id", updateUserInfo, userController.updateUserInfo);

module.exports = router;
