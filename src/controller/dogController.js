const { db, auth } = require("../Server");

const { Platform } = require("../enum");

const { DogFormData } = require("../model/DogModel");

exports.createDogLog = async (req, res) => {
  const platform = req.headers.Platform;

  if (!platform)
    return res.status(400).json({
      error: "Unspecified request platform",
      code: 400,
    });
  else {
    // 当请求来自微信，额外报错主人微信uniqueId，设置 isFromWX 为 true
    // 方便通过uniqueId，通过微信小程序直接联系主人
    console.log(platform);
  }

  const dogFormData = req.body;
  const { breedName, breedType, startDate, endDate, dogName } = dogFormData;

  if (!breedName || !breedType || !startDate || !endDate || !dogName)
    return res.status(400).json({
      error: "Missing required fields",
      code: 400,
    });

  const dogListRef = db.collection("Dogs_and_Owner");

  const dogLogData = {
    ...DogFormData,
    breedType: dogFormData.breedType,
    breedName: dogFormData.breedName,
    dogName: dogFormData.dogName,
    startDate: dogFormData.startDate,
    endDate: dogFormData.endDate,
    weight: dogFormData.weight ?? "",
    dailyPrice: dogFormData.dailyPrice ?? 0,
    ownerName: dogFormData.ownerName ?? "",
    contactNo: dogFormData.contactNo ?? "",
    notes: dogFormData.notes?.length ? dogFormData.notes : [],
    tourList: [],
    isFromWX: platform === Platform.wx,
  };

  // use Firebase auto-generated UID
  const dogLogRef = dogListRef.doc();
  const dogLogId = dogLogRef.id;

  try {
    // 使用 .set() 方法将数据插入 Firestore，文档 ID 为自动生成的 UID
    await dogLogRef.set(dogLogData);

    // 返回成功响应
    return res.status(201).json({
      data: { ...dogLogData, dogLogId },
      message: "Dog log created successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to create dog log",
      details: error.message,
    });
  }
};

exports.updateDogLog = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(401).json({ error: "Missing Log ID", code: 401 });

  const dogFormData = req.body;
  const platform = req.headers.Platform;

  if (!platform)
    return res.status(400).json({
      error: "Unspecified request platform",
      code: 400,
    });
  else {
    // 当请求来自微信，额外报错主人微信uniqueId，设置 isFromWX 为 true
    // 方便通过uniqueId，通过微信小程序直接联系主人
    console.log(platform);
  }

  const { breedName, breedType, startDate, endDate, dogName } = dogFormData;

  if (!breedName || !breedType || !startDate || !endDate || !dogName)
    return res.status(400).json({
      error: "Missing required fields",
      code: 400,
    });

  const dogListRef = db.collection("Dogs_and_Owner");

  // 获取指定 uid 的文档引用
  const dogLogRef = dogListRef.doc(id); // 使用传入的 id 查找文档

  try {
    const doc = await dogLogRef.get();

    if (!doc.exists) await this.createDogLog(req, res);

    await dogLogRef.update({
      ...doc.data(),
      breedType: dogFormData.breedType,
      breedName: dogFormData.breedName,
      dogName: dogFormData.dogName,
      startDate: dogFormData.startDate,
      endDate: dogFormData.endDate,
      weight: dogFormData.weight ?? "",
      dailyPrice: dogFormData.dailyPrice ?? 0,
      ownerName: dogFormData.ownerName ?? "",
      contactNo: dogFormData.contactNo ?? "",
      notes: dogFormData.notes?.length ? dogFormData.notes : [],
      isFromWX: platform === Platform.wx,
    });

    // 返回成功响应
    return res.status(201).json({
      data: { ...dogFormData, uid: id },
      message: "Dog log updated successfully",
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to update log",
      details: err.message,
      code: 500,
    });
  }
};

exports.removeDogLog = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing Log ID", code: 400 });
  }

  const dogLogRef = db.collection("Dogs_and_Owner").doc(id);

  try {
    const doc = await dogLogRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Document not found", code: 404 });
    }

    await dogLogRef.delete();

    return res.status(200).json({
      data: { dogLogId: id },
      message: "Remove Log success",
    });
  } catch (error) {
    console.error("Error removing document:", error);

    if (error.code === "permission-denied") {
      return res.status(403).json({
        error: "Permission denied",
        code: 403,
      });
    }

    return res.status(500).json({
      error: "Failed to remove log",
      details: error.message,
      code: 500,
    });
  }
};

exports.getDogLog = async (req, res) => {
  const { id } = req.params;

  if (!id) return res.status(401).json({ error: "Missing Log ID", code: 401 });

  const dogListRef = db.collection("Dogs_and_Owner");

  const dogLogRef = dogListRef.doc(id);

  try {
    const doc = await dogLogRef.get();

    if (!doc.exists)
      return res.status(401).json({ error: "Missing Data", code: 401 });

    return res.status(200).json({
      ...doc.data(),
      uid: id,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal error",
      details: err.message,
      code: 500,
    });
  }
};

exports.getAllLogs = async (req, res) => {
  try {
    const dogListRef = db.collection("Dogs_and_Owner");

    const snapshot = await dogListRef.get();

    const allLogs = [];

    snapshot.forEach((data) =>
      allLogs.push({
        dogLogId: data.id,
        ...data.data(),
      })
    );

    return res.status(200).json(allLogs);
  } catch (error) {
    return res.status(500).json({ error: "Internal Error", code: 500 });
  }
};
