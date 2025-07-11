const express = require("express");
const router = express.Router();

const userController = require("../controller/userController");

const {
  checkGetAllUsers,
  updateUserInfo,
  checkModifyTour,
} = require("../middleware/validator/checkPermission");

router.get("/all", checkGetAllUsers, userController.getAllUsers);

router.post("/register", userController.register);

router.post("/login", userController.login);

router.post("/logout", userController.logout);

router.post("/refreshToken", userController.refreshToken);

router.post("/mapUsers", checkGetAllUsers, userController.mapUsers);

router.put(
  "/updateUserRole/:id",
  checkGetAllUsers,
  userController.updateUserRole
);

router.put(
  "/toggleUserReceiveNotification/:id/:receiveNotification",
  checkGetAllUsers,
  userController.toggleUserReceiveNotification
);

router.put("/updateUser/:id", updateUserInfo, userController.updateUserInfo);

router.post(
  "/removeLinkedDogOwner/:id",
  checkGetAllUsers,
  userController.unlinkDogOwnerFromUser
);

module.exports = router;
