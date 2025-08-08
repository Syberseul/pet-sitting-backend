const admin = require("firebase-admin");
const sharp = require("sharp");

const { db, bucket } = require("../Server");

const { dbCollectionName } = require("../Server/enums/dbEnum");
const { interError } = require("../utils/utilFunctions");

const dogImageCollection = db.collection(dbCollectionName.DOG_IMAGE);

exports.uploadDogFile = async (dogId, imgBuffer) => {
  try {
    const compressedImg = await sharp(imgBuffer)
      .resize({ width: 1024, height: 1024, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    // upload file to Firebase Storage
    const path = this.getDogImgPath(dogId);

    const imgFile = bucket.file(path);
    await imgFile.save(compressedImg, {
      metadata: { contentType: "image/webp" },
    });

    // save metadata to Firestore
    const docRef = dogImageCollection.doc(dogId);
    await docRef.set(
      {
        dogId,
        path,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, path };
  } catch (error) {
    return { success: false, error };
  }
};

exports.removeDogImg = async (dogId) => {
  try {
    const path = this.getDogImgPath(dogId);

    const file = bucket.file(path);

    const [exists] = await file.exists();

    if (!exists) {
      console.warn(`File ${path} does not exist`);
      return { success: true, path };
    }

    await file.delete();

    const docRef = dogImageCollection.doc(dogId);

    await docRef.delete();

    return { success: true, path };
  } catch (error) {
    return { success: false, error };
  }
};

exports.getDogImgPath = (dogId) => `images/dog/${dogId}.webp`;

exports.getDogImg = async (req, res) => {
  const { dogId, filePath } = req.query;

  if (!dogId || !filePath) return interError(res, "Missing Dog Id or filePath");

  try {
    const docRef = dogImageCollection.doc(dogId);

    const docData = await docRef.get();

    if (!docData.exists) return interError(res, "File not exist");

    // avoid path iteration attack
    const path = filePath.replace(/\.\.\//g, "");

    if (docData.data().path !== path)
      return interError(res, "Dog ID not match with image path");

    const file = bucket.file(path);

    const [exists] = await file.exists();

    if (!exists) return interError(res, "File not exist");

    const [fileBuffer] = await file.download();

    res.setHeader("Content-Type", "image/webp");

    return res.status(200).send(fileBuffer);
  } catch (error) {
    return interError(res, error);
  }
};
