const { db } = require("../Server");
const {
  dbCollectionName,
  dbCollectionDocName,
} = require("../Server/enums/dbEnum");

const { DogInfo } = require("../model/DogModel");

const { interError } = require("../utils/utilFunctions");

const { v4: uuid } = require("uuid");

const admin = require("firebase-admin");
const NotificationService = require("../Server/notificationService");

const dogOwnerCollection = db.collection(dbCollectionName.DOG_OWNER);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const allOwnerRef = allDataList.doc(dbCollectionDocName.ALL_DOG_OWNERS);
const tourCollection = db.collection(dbCollectionName.DOG_TOUR);
const allTourRef = allDataList.doc(dbCollectionDocName.ALL_TOURS);

exports.createDog = async (req, res) => {
  const { ownerId } = req.body;

  if (!ownerId)
    return res.status(400).json({
      error: "Missing owner ID",
      code: 400,
    });

  try {
    const dogInfo = {
      ...DogInfo,
      ...req.body,
      uid: uuid(),
    };

    let updatedOwnerData;

    await db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(dogOwnerCollection.doc(ownerId));

      if (!ownerDoc.exists) throw new Error("Owner not found");

      const newDogs = [...ownerDoc.data().dogs, dogInfo];
      updatedOwnerData = {
        ...ownerDoc.data(),
        dogs: newDogs,
      };

      transaction.update(dogOwnerCollection.doc(ownerId), { dogs: newDogs });
      transaction.update(allOwnerRef, { [ownerId]: updatedOwnerData });
    });

    return res.status(200).json({
      data: updatedOwnerData,
      message: "Dog created successfully",
    });
  } catch (err) {
    if (err.message === "Owner not found")
      return res.status(404).json({
        error: "Owner not found",
        code: 404,
      });
    return interError(res, err);
  }
};

exports.updateDog = async (req, res) => {
  const { ownerId, uid } = req.body;

  if (!ownerId || !uid) {
    return res.status(400).json({
      error: "Missing required ID",
      code: 400,
    });
  }

  try {
    let updatedOwnerData;
    let toursToUpdate = [];

    const toursQuery = tourCollection.where("dogId", "==", uid);
    const toursSnapshot = await toursQuery.get();
    toursSnapshot.forEach((doc) => {
      toursToUpdate.push({
        id: doc.id,
        data: doc.data(),
      });
    });

    await db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(dogOwnerCollection.doc(ownerId));
      if (!ownerDoc.exists) throw new Error("Missing Owner info");

      const newDogs = ownerDoc.data().dogs.map((d) => {
        d.ownerId = ownerId;
        if (d.uid !== uid) return d;
        return {
          ...d,
          ...req.body,
          uid,
        };
      });

      updatedOwnerData = {
        ...ownerDoc.data(),
        dogs: newDogs,
      };

      transaction.update(dogOwnerCollection.doc(ownerId), { dogs: newDogs });
      transaction.update(allOwnerRef, { [ownerId]: updatedOwnerData });

      toursToUpdate.forEach((tour) => {
        const tourRef = tourCollection.doc(tour.id);
        const newTourInfo = {
          ...tour.data,
          breedName: req.body.breedName || tour.data.breedName,
          breedType: req.body.breedType || tour.data.breedType,
          desex: req.body.desex ?? tour.data.desex,
          dogName: req.body.dogName || tour.data.dogName,
          sex: req.body.sex ?? tour.data.sex,
          weight: req.body.weight ?? tour.data.weight,
        };
        transaction.update(tourRef, newTourInfo);
        transaction.update(allTourRef, { [tour.id]: newTourInfo });
      });
    });

    return res.status(200).json({
      data: updatedOwnerData,
      message: "Dog updated successfully",
    });
  } catch (err) {
    console.error("Error in updateDog:", err);
    if (err.message === "Missing Owner info") {
      return res.status(404).json({
        error: "Missing Owner info",
        code: 404,
      });
    }
    return interError(res, err);
  }
};

exports.removeDog = async (req, res) => {
  const { ownerId, uid } = req.body;

  try {
    const batch = db.batch();

    const ownerRef = dogOwnerCollection.doc(ownerId);
    const ownerDoc = await ownerRef.get();
    if (!ownerDoc.exists) throw new Error("Owner not found");

    const filteredDogs = ownerDoc.data().dogs.filter((d) => d.uid !== uid);
    batch.update(ownerRef, { dogs: filteredDogs });
    batch.update(allOwnerRef, {
      [ownerId]: { ...ownerDoc.data(), dogs: filteredDogs },
    });

    const { notifications } = await this.prepareDogRemoval(uid, batch);

    await batch.commit();
    await Promise.allSettled(notifications);

    return res.status(200).json({
      data: { uid },
      message: "Dog removed successfully",
    });
  } catch (err) {
    if (err.message === "Missing Owner info") {
      return res.status(404).json({ error: "Missing Owner info", code: 404 });
    }
    return interError(res, err);
  }
};

exports.prepareDogRemoval = async (dogId, batch) => {
  if (!dogId) throw new Error("Missing dogId");

  const tourResult = await this.removeDogRelatedTour(dogId, batch);

  return {
    notifications: tourResult.notificationPromises || [],
  };
};

exports.removeDogRelatedTour = async (dogId, batch = null) => {
  if (!dogId) throw new Error("Missing dogId");

  try {
    const toursSnapshot = await tourCollection
      .where("dogId", "==", dogId)
      .get();

    if (toursSnapshot.empty)
      return {
        deletedCount: 0,
        message: "No related tours need to remove.",
        batchOperations: [],
        notificationPromises: [],
      };

    const localBatch = batch || db.batch();

    const notificationPromises = [];
    const allToursUpdates = {};

    toursSnapshot.forEach((tour) => {
      const tourId = tour.id;

      localBatch.delete(tourCollection.doc(tourId));
      allToursUpdates[tourId] = admin.firestore.FieldValue.delete();

      notificationPromises.push(
        NotificationService.cancelTourNotification(tourId)
      );
    });

    localBatch.update(allTourRef, allToursUpdates);

    return {
      deletedCount: toursSnapshot.size,
      message: "All dog related tours has been marked for removal.",
      batchOperations: localBatch,
      notificationPromises,
    };
  } catch (error) {
    console.error("Error in remove dog related tours: ", error);
    throw interError(error, 500);
  }
};
