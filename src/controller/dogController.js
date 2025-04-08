const { db, auth } = require("../Server");

const { DogFormData } = require("../model/DogModel");

exports.createDogLog = async (req, res) => {
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
  const dogFormData = req.body;
  const { breedName, breedType, startDate, endDate, dogName, uid } =
    dogFormData;

  if (!uid)
    return res.status(400).json({
      error: "Missing UID",
      code: 400,
    });

  if (!breedName || !breedType || !startDate || !endDate || !dogName)
    return res.status(400).json({
      error: "Missing required fields",
      code: 400,
    });

  const dogListRef = db.collection("Dogs_and_Owner");

  // 获取指定 uid 的文档引用
  const dogLogRef = dogListRef.doc(dogLogId); // 使用传入的 dogLogId 查找文档

  try {
    const doc = await dogLogRef.get();

    if (!doc.exists) await this.createDogLog(req, res);

    await dogLogRef.update({
      ...doc,
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
    });

    // 返回成功响应
    return res.status(201).json({
      data: { ...dogLogData, dogLogId },
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
