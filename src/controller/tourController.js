const { db } = require("../Server");

const { TourInfo } = require("../model/TourModel");

const { interError } = require("../utils/utilFunctions");

const NotificationService = require("../Server/notificationService");

// const ServerNotificationService = require("../../functions/Service/notificationService");

const admin = require("firebase-admin");
const {
  dbCollectionName,
  dbCollectionDocName,
} = require("../Server/enums/dbEnum");

const { UserRole, TourStatus } = require("../enum");
const {
  getTourStatus,
  getTodayDateString,
  checkTourIsFinished,
  isDateBeforeToday,
} = require("../utils/helper");

const tourCollection = db.collection(dbCollectionName.DOG_TOUR);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const userCollection = db.collection(dbCollectionName.USER);

exports.createTour = async (req, res) => {
  const { dogId, ownerId } = req.body;

  if (!dogId || !ownerId)
    return res.status(400).json({ error: "Missing ID", code: 400 });

  const tourData = {
    ...TourInfo,
    ...req.body,
  };

  // value determine for UI only
  delete tourData.checked;

  const tourListRef = tourCollection.doc();
  const tourListId = tourListRef.id;

  try {
    const savedTour = { ...tourData, uid: tourListId };

    await tourListRef.set(savedTour);

    const allToursRef = allDataList.doc(dbCollectionDocName.ALL_TOURS);

    await allToursRef.update({
      [tourListId]: savedTour,
    });

    await NotificationService.scheduleTourNotification(savedTour);

    // await ServerNotificationService.checkPendingNewNotifications();

    return res.status(201).json({
      data: savedTour,
      message: "Tour created",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.updateTour = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(401).json({ error: "Missing tour ID", code: 401 });

  const { dogId, ownerId, endDate } = req.body;

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

    data.status = getTourStatus(data);

    // if new updated endDate is after today, tour status suppose to reset back to PENDING
    if (endDate && !isDateBeforeToday(endDate))
      data.status = TourStatus.PENDING;

    await tourRef.update(data);

    await allDataList.doc(dbCollectionDocName.ALL_TOURS).update({
      [id]: data,
    });

    await NotificationService.updateTourNotification(id, data);

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
      .doc(dbCollectionDocName.ALL_TOURS)
      .update({ [id]: admin.firestore.FieldValue.delete() });

    await NotificationService.cancelTourNotification(id);

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
    const userRole = req.user?.role || UserRole.VISITOR;
    const userId = req.user?.uid || "";

    if (userRole == UserRole.VISITOR || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allTours = await allDataList.doc(dbCollectionDocName.ALL_TOURS).get();

    if (!allTours.exists)
      return res.status(404).json({
        error: "No collection table found",
        code: 404,
      });

    const allToursData = allTours.data();

    const toursArray = Object.values(allToursData).sort(
      (a, b) => b.createdAt - a.createdAt
    );

    if ([UserRole.ADMIN, UserRole.DEVELOPER].includes(userRole))
      return res.status(200).json(toursArray);

    // userRole === UserRole.DOG_OWNER
    const userDoc = await userCollection.doc(userId).get();
    const userData = userDoc.data();

    if (!userData.dogOwnerRefNo) return interError(res, "No Dog Owner Linked");

    // return most recent 5 tours
    const filteredTours = toursArray.filter(
      (tour) => tour.ownerId === userData.dogOwnerRefNo
    );

    const MAX_COUNT = 5;
    let maxCount = 0,
      toursMap = new Map();

    for (const tour of filteredTours) {
      const { startDate, endDate } = tour;
      const mergedDate = `${startDate}-${endDate}`;

      if (toursMap.has(mergedDate))
        toursMap.set(mergedDate, [...toursMap.get(mergedDate), tour]);
      else if (maxCount < MAX_COUNT) {
        maxCount++;
        toursMap.set(mergedDate, [tour]);
      }
    }

    const potentialTours = {};

    for (const [key, value] of toursMap.entries()) {
      potentialTours[key] = value;
    }

    return res.status(200).json({
      tours: potentialTours,
      count: maxCount,
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.markTourFinish = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(401).json({ error: "Missing tour ID", code: 401 });

  const tourRef = tourCollection.doc(id);

  try {
    const doc = await tourRef.get();

    if (!doc.exists)
      return res.status(400).json({ error: "No tour found", code: 400 });

    const docData = doc.data();

    const data = {
      ...docData,
      status: TourStatus.FINISHED,
      endDate: isDateBeforeToday(docData.endDate)
        ? docData.endDate
        : getTodayDateString(),
    };

    await tourRef.update(data);

    await allDataList.doc(dbCollectionDocName.ALL_TOURS).update({
      [id]: data,
    });

    await NotificationService.updateTourNotification(id, data);

    return res.status(200).json({
      data,
      message: "Tour mark as finished!",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.extractFinishedTours = async (req, res) => {
  try {
    const allTours = await allDataList.doc(dbCollectionDocName.ALL_TOURS).get();

    if (!allTours.exists)
      return res.status(404).json({
        error: "No collection table found",
        code: 404,
      });

    const allToursData = Object.values(allTours.data());

    const allFinishedTours = allToursData.filter((tour) =>
      checkTourIsFinished(tour)
    );

    if (!allFinishedTours.length)
      return res.status(200).json({
        data: [],
        message: "No finished tours need to be extracted.",
      });

    const DELETE_THRESHOLD = 10;
    const BATCH_LIMIT = 500;

    const notificationPromises = [];
    const allToursRef = allDataList.doc(dbCollectionDocName.ALL_TOURS);

    for (let i = 0; i < allFinishedTours.length; i += BATCH_LIMIT) {
      const chunk = allFinishedTours.slice(i, i + BATCH_LIMIT);
      const chunkBatch = db.batch();

      chunk.forEach((tour) => {
        const tourRef = tourCollection.doc(tour.uid);
        chunkBatch.delete(tourRef);
        notificationPromises.push(
          NotificationService.cancelTourNotification(tour.uid)
        );

        if (allFinishedTours.length <= DELETE_THRESHOLD)
          chunkBatch.update(allToursRef, {
            [tour.uid]: admin.firestore.FieldValue.delete(),
          });
      });

      await chunkBatch.commit();
    }

    if (allFinishedTours.length > DELETE_THRESHOLD) {
      const remainingToursSnapshot = await tourCollection.get();
      const remainingTours = remainingToursSnapshot.empty
        ? {}
        : Object.fromEntries(
            remainingToursSnapshot.docs.map((doc) => [doc.id, doc.data()])
          );
      await allDataList.doc(dbCollectionDocName.ALL_TOURS).set(remainingTours);
    }

    await Promise.allSettled(notificationPromises);

    return res.status(200).json(allFinishedTours);
  } catch (error) {
    return interError(res, error);
  }
};
