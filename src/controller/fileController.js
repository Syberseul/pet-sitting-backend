const admin = require("firebase-admin");
const sharp = require("sharp");

const { db, bucket } = require("../Server");
const { interError } = require("../utils/utilFunctions");
const { dbCollectionName } = require("../Server/enums/dbEnum");

const dogImageCollection = db.collection(dbCollectionName.DOG_IMAGE);

exports.uploadDogFile = async (req, res) => {
  try {
    const file = req.file;

    if (!file)
      return res.status(400).json({ error: "Missing file content", code: 400 });

    const { dogId } = req.params;
    const { notes } = req.body;

    const compressedImg = await sharp(file.buffer)
      .resize({ width: 1024, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // upload file to Firebase Storage
    const path = `images/dog/${dogId}.webp`;
    const imgFile = bucket.file(path);
    await imgFile.save(compressedImg, {
      metadata: { contentType: "image/webp" },
    });

    // save metadata to Firestore
    const docRef = dogImageCollection.doc(dogId);
    await docRef.set(
      {
        dogId,
        path: path,
        notes: notes || [],
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({
      code: 200,
      path: path,
    });
  } catch (error) {
    return interError(res, error);
  }
};
