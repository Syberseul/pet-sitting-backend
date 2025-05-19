const { db } = require("../Server");

const { TourInfo } = require("../model/TourModel");

const { interError } = require("../utils/utilFunctions");

const admin = require("firebase-admin");

const tourCollection = db.collection("DogTours");
const allDataList = db.collection("List");

exports.createTour = async (req, res) => {
  const { dogId, ownerId } = req.body;

  if (!dogId || !ownerId)
    return res.status(400).json({ error: "Missing ID", code: 400 });

  const tourData = {
    ...TourInfo,
    ...req.body,
  };

  const tourListRef = tourCollection.doc();
  const tourListId = tourListRef.id;

  try {
    await tourListRef.set({ ...tourData, uid: tourListId });

    const allToursRef = allDataList.doc("AllTours");

    await allToursRef.update({
      [tourListId]: { ...tourData, uid: tourListId },
    });

    return res.status(201).json({
      data: { ...tourData, uid: tourListId },
      message: "Tour created",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.updateTour = async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(401).json({ error: "Missing owner ID", code: 401 });

  const { dogId, ownerId } = req.body;

  if (!dogId || !ownerId)
    return res.status(400).json({ error: "Missing ID", code: 400 });

  const tourRef = tourCollection.doc(id);

  try {
    const doc = await tourRef.get();

    if (!doc.exists)
      return res.status(400).json({
        error: "No tour found",
        code: 400,
      });

    const data = {
      ...doc.data(),
      ...req.body,
    };

    await tourRef.update(data);

    await allDataList.doc("AllTours").update({
      [id]: data,
    });

    return res.status(200).json({
      data,
      message: "Tour updated",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.removeTour = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(400).json({ error: "Missing tour ID", code: 400 });

  const tourRef = tourCollection.doc(id);

  try {
    const doc = await tourRef.get();

    if (!doc.exists)
      return res.status(404).json({ error: "Tour not found", code: 404 });

    await tourRef.delete();

    await allDataList
      .doc("AllTours")
      .update({ [id]: admin.firestore.FieldValue.delete() });

    return res.status(200).json({
      data: { uid: id },
      message: "Tour removed",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.getAllTours = async (req, res) => {
  try {
    const allTours = await allDataList.doc("AllTours").get();

    if (!allTours.exists)
      return res.status(404).json({
        error: "No collection table found",
        code: 404,
      });

    const allToursData = allTours.data();

    const toursArray = Object.values(allToursData);

    return res.status(200).json(toursArray);
  } catch (error) {
    return interError(res, error);
  }
};
