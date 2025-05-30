const { db } = require("../Server");
const {
  dbCollectionName,
  dbCollectionDocName,
} = require("../Server/enums/dbEnum");

const { DogInfo } = require("../model/DogModel");

const { interError } = require("../utils/utilFunctions");

const { v4: uuid } = require("uuid");

const dogOwnerCollection = db.collection(dbCollectionName.DOG_OWNER);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const allOwnerRef = allDataList.doc(dbCollectionDocName.ALL_DOG_OWNERS);

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

  if (!ownerId || !uid)
    return res.status(400).json({
      error: "Missing required ID",
      code: 400,
    });

  try {
    let updatedOwnerData;

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

      transaction.update(dogOwnerCollection.doc(ownerId), {
        dogs: newDogs,
      });
      transaction.update(allOwnerRef, { [ownerId]: updatedOwnerData });
    });

    return res.status(200).json({
      data: updatedOwnerData,
      message: "Dog updated successfully",
    });
  } catch (err) {
    if (err.message === "Missing Owner info")
      return res.status(404).json({
        error: "Missing Owner info",
        code: 404,
      });
    return interError(res, err);
  }
};

exports.removeDog = async (req, res) => {
  const { ownerId, uid } = req.body;

  if (!ownerId || !uid)
    return res.status(400).json({
      error: "Missing required ID",
      code: 400,
    });

  try {
    await db.runTransaction(async (transaction) => {
      const ownerDoc = await transaction.get(dogOwnerCollection.doc(ownerId));

      if (!ownerDoc.exists) throw new Error("Missing Owner info");

      const filteredDogs = ownerDoc.data().dogs.filter((d) => d.uid !== uid);
      const newData = {
        ...ownerDoc.data(),
        dogs: filteredDogs,
      };

      transaction.update(dogOwnerCollection.doc(ownerId), {
        dogs: filteredDogs,
      });
      transaction.update(allOwnerRef, { [ownerId]: newData });
    });

    return res.status(200).json({
      data: { uid },
      message: "Dog removed successfully",
    });
  } catch (err) {
    if (err.message === "Missing Owner info")
      return res.status(404).json({
        error: "Missing Owner info",
        code: 404,
      });
    return interError(res, err);
  }
};
