const express = require("express");
const router = express.Router();

const dogOwnerController = require("../controller/dogOwnerController");
const {
  checkGetOwnerById,
  checkGetAllOwners,
  checkCreateOwner,
  checkUpdateOwner,
} = require("../middleware/validator/checkPermission");

/**
 * ADMIN / DEVELOPER - access all details
 * DOG OWNER - ONLY access to his/her own details
 */
router.get(
  "/detail/:id",
  checkGetOwnerById,
  dogOwnerController.getDogOwnerInfo
);

/**
 * ADMIN / DEVELOPER ONLY
 */
router.get("/all", checkGetAllOwners, dogOwnerController.getAllDogOwners);

/**
 * ADMIN / DEVELOPER - access all details
 * DOG OWNER - NO ACCESS
 * VISITOR - SINGLE ACCESS to become a dog owner
 */
router.post("/create", checkCreateOwner, dogOwnerController.createDogOwner);

/**
 * ADMIN / DEVELOPER - access all details
 * DOG OWNER - access to update his/her own details
 * VISITOR - NO ACCESS
 */
router.put("/update/:id", checkUpdateOwner, dogOwnerController.updateDogOwner);

/**
 * ADMIN / DEVELOPER ONLY
 */
router.delete(
  "/remove/:id",
  checkGetAllOwners,
  dogOwnerController.removeDogOwner
);

module.exports = router;
