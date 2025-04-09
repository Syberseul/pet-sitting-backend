const { db, auth } = require("../Server");

const { UserInfo } = require("../model/UserModel");

const { createToken } = require("../utils/jwt");
const { hashPwd, verifyPassword } = require("../utils/pwdUtils");

exports.register = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    const userRecord = await auth.createUser({
      email,
      password: hashPwd(password),
      emailVerified: false,
    });

    const userRef = db.collection("User").doc(userRecord.uid);
    const { shortToken, longToken } = await createToken();

    await userRef.set({
      ...UserInfo,
      email,
      password: hashPwd(password),
      username,
      token: shortToken,
      refreshToken: longToken,
    });

    res.status(201).json({
      uid: userRecord.uid,
      username,
      email: userRecord.email,
      token: shortToken,
      refreshToken: longToken,
      role: Number(0),
    });
  } catch (err) {
    console.error("Register failed:", err);

    res.status(500).json({
      error: err.errorInfo.message,
      code: 500,
      details: {},
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
        code: 400,
      });
    }

    const userRef = db.collection("User");
    const snapshot = await userRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: 401,
      });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const isPwdValid = verifyPassword(password, userData.password);

    if (!isPwdValid) {
      return res.status(401).json({
        error: "Invalid email or password",
        code: 401,
      });
    }

    const { shortToken, longToken } = await createToken();

    await userDoc.ref.update({
      token: shortToken,
      refreshToken: longToken,
      lastLogin: new Date(),
    });

    res.status(200).json({
      uid: userDoc.id,
      username: userData.username,
      email: userData.email,
      token: shortToken,
      refreshToken: longToken,
      role: userData.role || 0,
    });
  } catch (error) {
    res.status(500).json({
      error: "Login failed",
      code: 500,
      details: {},
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { uid, token, refreshToken, email } = req.body;

    if (!uid || !token || !refreshToken || !email)
      return res.status(401).json({
        error: "Missing properties to fresh token.",
        code: 401,
      });

    const userRef = db.collection("User");
    const snapshot = await userRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty)
      return res.status(401).json({
        error: "No valid user.",
        code: 401,
      });

    const userDoc = snapshot.docs[0];

    const { shortToken, longToken } = await createToken();

    await userDoc.ref.update({
      token: shortToken,
      refreshToken: longToken,
      lastLogin: new Date(),
    });

    res.status(200).json({
      token: shortToken,
      refreshToken: longToken,
      uid,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Error",
      code: 500,
      details: {},
    });
  }
};
