const express = require("express");
const router = express.Router();

const tourRouter = require("../controller/tourController");

const {
  checkGetAllTours,
  checkModifyTour,
  adminONLY,
} = require("../middleware/validator/checkPermission");

/**
 * ADMIN / DEVELOPER - access to all tours info
 * DOG OWNER - access to all his/her own tours
 */
router.get("/getTours", checkGetAllTours, tourRouter.getAllTours);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - after creation send notification to ADMIN/DEVELOPER for approval
 */
router.post("/createTour", checkModifyTour, tourRouter.createTour);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - only allow to update their own tours
 */
router.put("/updateTour/:id", checkModifyTour, tourRouter.updateTour);
router.put(
  "/updateOwnerTours",
  checkModifyTour,
  tourRouter.updateDogOwnerTours
);

/**
 * ADMIN / DEVELOPER
 */
router.put("/markTourFinish/:id", checkModifyTour, tourRouter.markTourFinish);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - only allow to update their own tours
 */
router.delete("/removeTour/:id", checkModifyTour, tourRouter.removeTour);

/**
 * ADMIN ONLY
 */
router.post(
  "/extractFinishedTours",
  adminONLY,
  tourRouter.extractFinishedTours
);

module.exports = router;
