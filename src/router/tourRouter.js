const express = require("express");
const router = express.Router();

const tourRouter = require("../controller/tourController");

const {
  checkGetAllTours,
  checkModifyTour,
} = require("../middleware/validator/checkPermission");

/**
 * ADMIN / DEVELOPER - access to all tours info
 * DOG OWNER - access to all his/her own tours
 */
router.get("/getTours", checkGetAllTours, tourRouter.getAllTours);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - will implement ITF
 */
router.post("/createTour", checkModifyTour, tourRouter.createTour);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - will implement ITF, ONLY allow update his/her own tour
 */
router.put("/updateTour/:id", checkModifyTour, tourRouter.updateTour);

/**
 * ADMIN / DEVELOPER
 * DOG OWNER - will implement ITF, ONLY allow remove his/her own tour
 */
router.delete("/removeTour/:id", checkModifyTour, tourRouter.removeTour);

module.exports = router;
