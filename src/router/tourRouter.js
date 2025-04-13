const express = require("express");
const router = express.Router();

const tourRouter = require("../controller/tourController");

router.post("/createTour", tourRouter.createTour);

router.put("/updateTour/:id", tourRouter.updateTour);

router.delete("/removeTour/:id", tourRouter.removeTour);

router.get("/getTours", tourRouter.getAllTours);

module.exports = router;
