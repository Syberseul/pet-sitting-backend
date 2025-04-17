const { db } = require("../Server");
const { DogInfo } = require("../model/DogModel");

const { DogOwnerInfo } = require("../model/UserModel");

const {
  interError,
  isWxPlatform,
  missingWxProperty,
} = require("../utils/utilFunctions");

const { v4: uuid } = require("uuid");

const dogOwnerCollection = db.collection("DogOwner");
const allDataList = db.collection("List");

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

    const ownerData = {
      ...DogOwnerInfo,
      userId: userId ?? "",
      name: name ?? "",
      dogs: dogs.map((dog) => ({
        ...DogInfo,
        ...dog,
        uid: uuid(),
        ownerId: ownerListId,
      })),
      contactNo: contactNo ?? "",
      isFromWx,
      wxId: wxId ?? "",
      uid: ownerListId,
    };

    try {
      await ownerListRef.set(ownerData);

      const allOwnersRef = allDataList.doc("AllDogOwners");

      await allOwnersRef.set({
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

  const { name, contactNo, dogs } = req.body;

  const ownerRef = dogOwnerCollection.doc(id);

  try {
    const doc = await ownerRef.get();

    if (!doc.exists)
      return res.status(400).json({
        error: "No dog owner found",
        code: 400,
      });

    const data = {
      ...doc.data(),
      name: name ?? "",
      contactNo: contactNo ?? "",
      dogs: dogs ?? [],
    };

    await ownerRef.update(data);

    await allDataList.doc("AllDogOwners").update({
      [id]: data,
    });

    return res.status(200).json({
      data,
      message: "Owner updated",
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

exports.getAllDogOwners = async (req, res) => {
  try {
    // const snapShot = await dogOwnerCollection.get();

    // const owners = [];

    // snapShot.forEach((owner) => {
    //   owners.push({
    //     ...owner.data(),
    //   });
    // });

    // return res.status(200).json(owners);
    const allOwners = await allDataList.doc("AllDogOwners").get();

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
