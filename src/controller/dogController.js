const { db } = require("../Server");
const { dbCollectionName } = require("../Server/enums/dbEnum");

const { DogInfo } = require("../model/DogModel");

const { interError } = require("../utils/utilFunctions");

const { v4: uuid } = require("uuid");

const dogOwnerCollection = db.collection(dbCollectionName.DOG_OWNER);

exports.createDog = async (req, res) => {
  const { ownerId, breedType, dogName, weight, alive } = req.body;

  if (!ownerId)
    return res.status(400).json({
      error: "Missing owner ID",
      code: 400,
    });

  const ownerRef = dogOwnerCollection.doc(ownerId);

  try {
    const doc = await ownerRef.get();

    if (!doc.exists)
      return res.status(401).json({
        error: "Missing Owner info",
        code: 400,
      });

    const dogs = doc.data().dogs;

    const dogInfo = {
      ...DogInfo,
      uid: uuid(),
      breedType,
      dogName,
      weight,
      alive,
    };

    const data = {
      ...doc.data(),
      dogs: [...dogs, dogInfo],
    };

    await ownerRef.update(data);

    return res.status(200).json({
      data,
      message: "Dog created",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.updateDog = async (req, res) => {
  const { ownerId, breedType, dogName, weight, alive, uid } = req.body;

  if (!ownerId)
    return res.status(400).json({
      error: "Missing owner ID",
      code: 400,
    });

  const ownerRef = dogOwnerCollection.doc(ownerId);

  try {
    const doc = await ownerRef.get();

    if (!doc.exists)
      return res.status(401).json({
        error: "Missing Owner info",
        code: 400,
      });

    const dogs = doc.data().dogs;

    const data = {
      ...doc.data(),
      dogs: dogs.map((d) => {
        d.ownerId = ownerId;
        if (d.uid != uid) return d;
        return {
          ...d,
          breedType,
          dogName,
          weight,
          alive,
        };
      }),
    };

    await ownerRef.update(data);

    return res.status(200).json({
      data,
      message: "Dog updated",
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.removeDog = async (req, res) => {
  const { ownerId, uid } = req.body;

  if (!ownerId)
    return res.status(400).json({
      error: "Missing owner ID",
      code: 400,
    });

  const ownerRef = dogOwnerCollection.doc(ownerId);

  try {
    const doc = await ownerRef.get();

    if (!doc.exists)
      return res.status(401).json({
        error: "Missing Owner info",
        code: 400,
      });

    const dogs = doc.data().dogs;

    await ownerRef.update({
      ...doc.data(),
      dogs: dogs.filter((d) => d.uid != uid),
    });

    return res.status(200).json({
      data: { uid },
      message: "Dog removed",
    });
  } catch (error) {
    return interError(res, error);
  }
};
