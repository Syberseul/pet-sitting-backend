const { db } = require("../Server");
const {
  dbCollectionName,
  dbCollectionDocName,
} = require("../Server/enums/dbEnum");
const { DogInfo } = require("../model/DogModel");

const { DogOwnerInfo } = require("../model/UserModel");

const {
  interError,
  isWxPlatform,
  missingWxProperty,
} = require("../utils/utilFunctions");

const { v4: uuid } = require("uuid");

const admin = require("firebase-admin");
const { prepareDogRemoval } = require("./dogController");
const {
  uploadDogFile,
  removeDogImg,
  getDogImgPath,
} = require("./fileController");
const { tryUploadDogFile } = require("../utils/helper");

const dogOwnerCollection = db.collection(dbCollectionName.DOG_OWNER);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const allOwnersRef = allDataList.doc(dbCollectionDocName.ALL_DOG_OWNERS);

exports.createDogOwner = async (req, res) => {
  try {
    const isFromWx = isWxPlatform(req);

    const { name, contactNo, wxId, userId, dogs } = req.body;

    if (isFromWx && !wxId) return missingWxProperty(res);

    if (!dogs || !dogs.length)
      return res.status(400).json({
        error: "You need as least one dog to be a dog owner",
        code: 400,
      });

    const ownerListRef = dogOwnerCollection.doc();

    const ownerListId = ownerListRef.id;

    const modifiedDogs = await Promise.all(
      dogs.map(async (dog) => {
        const dogId = uuid();
        const newDog = {
          ...DogInfo,
          ...dog,
          uid: dogId,
          ownerId: ownerListId,
        };

        delete newDog.img;

        const dogImgPath = await tryUploadDogFile(dog.img, dogId);

        if (dogImgPath) newDog.imgPath = dogImgPath;

        return newDog;
      })
    );

    const ownerData = {
      ...DogOwnerInfo,
      userId: userId ?? "",
      name: name ?? "",
      dogs: modifiedDogs,
      contactNo: contactNo ?? "",
      isFromWx,
      wxId: wxId ?? "",
      uid: ownerListId,
    };

    try {
      await ownerListRef.set(ownerData);

      await allOwnersRef.update({
        [ownerListId]: { ...ownerData, uid: ownerListId },
      });

      return res.status(201).json({
        data: { ...ownerData, uid: ownerListId },
        message: "Owner created",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        error: "Failed to create dog owner",
        code: 500,
      });
    }
  } catch (error) {
    return interError(res, error);
  }
};

exports.updateDogOwner = async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(401).json({ error: "Missing owner ID", code: 401 });

  const { name, contactNo, dogs: newDogs = [] } = req.body;

  const ownerRef = dogOwnerCollection.doc(id);

  try {
    const doc = await ownerRef.get();
    if (!doc.exists)
      return res.status(404).json({
        error: "Owner not found",
        code: 404,
      });

    const currentData = doc.data();
    const currentDogs = currentData.dogs || [];

    const removedDogs = currentDogs.filter(
      (currDog) => !newDogs.some((newDog) => newDog.uid === currDog.uid)
    );

    const batch = db.batch();
    const allNotifications = [];

    const dogRemovalPromises = removedDogs.map((dog) =>
      prepareDogRemoval(dog.uid, batch).then((result) => {
        allNotifications.push(...result.notifications);
      })
    );

    await Promise.all(dogRemovalPromises);

    const dogImgRemovalPromises = removedDogs.map((dog) =>
      removeDogImg(dog.uid)
    );

    await Promise.all(dogImgRemovalPromises);

    const modifiedDogs = await Promise.all(
      newDogs.map(async (dog) => {
        const dogId = !dog.hasOwnProperty("uid") || !dog.uid ? uuid() : dog.uid;

        const newDog = {
          ...dog,
          dogId,
          ownerId: id,
        };

        delete newDog.img;

        const dogImgPath = await tryUploadDogFile(dog.img, dogId);

        if (dogImgPath) newDog.imgPath = dogImgPath;

        return newDog;
      })
    );

    const updatedData = {
      ...currentData,
      name: name ?? "",
      contactNo: contactNo ?? "",
      dogs: modifiedDogs.length ? modifiedDogs : [],
    };

    batch.update(ownerRef, updatedData);
    batch.update(allOwnersRef, { [id]: updatedData });

    await batch.commit();
    await Promise.allSettled(allNotifications);

    return res.status(200).json({
      data: updatedData,
      message: `Owner updated, with ${removedDogs.length} dogs' tours been removed.`,
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.getDogOwnerInfo = async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(401).json({ error: "Missing owner ID", code: 401 });

  const ownerRef = dogOwnerCollection.doc(id);

  try {
    const doc = await ownerRef.get();

    if (!doc.exists)
      return res.status(401).json({ error: "Missing Owner info", code: 400 });

    return res.status(200).json({
      ...doc.data(),
      uid: id,
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.getUserRefNo = async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res.status(401).json({ error: "Missing owner ID", code: 401 });

  const ownerRef = dogOwnerCollection.doc(id);

  try {
    const doc = await ownerRef.get();
    if (!doc.exists)
      return res.status(401).json({ error: "Owner not found", code: 401 });

    const ownerData = doc.data();

    if (ownerData.hasOwnProperty("userRefNo"))
      return res.status(200).json({
        data: {
          userRefNo: ownerData.userRefNo,
        },
      });

    const updatedData = {
      ...ownerData,
      userRefNo: id,
    };

    const batch = db.batch();

    batch.update(ownerRef, updatedData);
    batch.update(allOwnersRef, { [id]: updatedData });

    await batch.commit();

    return res.status(200).json({
      data: {
        userRefNo: updatedData.userRefNo,
      },
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.getAllDogOwners = async (req, res) => {
  try {
    const allOwners = await allOwnersRef.get();

    if (!allOwners.exists)
      return res.status(404).json({
        error: "No collection table found",
        code: 404,
      });

    const allOwnersData = allOwners.data();

    const ownersArray = Object.values(allOwnersData);

    return res.status(200).json(ownersArray);
  } catch (error) {
    return interError(res, error);
  }
};

exports.removeDogOwner = async (req, res) => {
  const { id } = req.params;

  try {
    const batch = db.batch();
    const allNotifications = [];
    const ownerRef = dogOwnerCollection.doc(id);
    const ownerDoc = await ownerRef.get();

    if (!ownerDoc.exists)
      return res.status(404).json({ error: "Owner not found", code: 404 });

    batch.update(allOwnersRef, {
      [id]: admin.firestore.FieldValue.delete(),
    });

    const dogs = ownerDoc.data().dogs || [];
    const dogRemovalPromises = dogs.map((dog) =>
      prepareDogRemoval(dog.uid, batch).then((result) => {
        allNotifications.push(...result.notifications);
      })
    );
    const dogImgRemovalPromises = dogs.map((dog) => removeDogImg(dog.uid));

    await Promise.all(dogRemovalPromises);

    await Promise.all(dogImgRemovalPromises);

    batch.delete(ownerRef);

    await batch.commit();

    await Promise.allSettled(allNotifications);

    return res.status(200).json({
      message: `Owner and ${dogs.length} dogs removed`,
      data: {
        ownerId: id,
        deletedDogs: dogs.length,
      },
    });
  } catch (err) {
    console.error("[removeDogOwner] Error:", err);
    return interError(res, err);
  }
};
