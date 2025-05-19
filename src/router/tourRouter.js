const express = require("express");
const router = express.Router();

const tourRouter = require("../controller/tourController");

router.get("/getTours", tourRouter.getAllTours);

router.post("/createTour", tourRouter.createTour);

router.put("/updateTour/:id", tourRouter.updateTour);

router.delete("/removeTour/:id", tourRouter.removeTour);

module.exports = router;
