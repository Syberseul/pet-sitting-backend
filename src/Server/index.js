require("dotenv").config();

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
});

const db = admin.firestore();
const auth = admin.auth();

admin
  .auth()
  .listUsers(1)
  .then(() => console.log("✅ Firebase Admin connected"))
  .catch((err) => console.error("❌ Connection Failure:", err));

module.exports = { db, auth };
