const { db, auth } = require("../Server");

const { UserInfo } = require("../model/UserModel");

const { createToken } = require("../utils/jwt");
const { hashPwd } = require("../utils/pwdUtils");

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
      email: userRecord.email,
      token: shortToken,
      refreshToken: longToken,
      role: Number(0),
    });
  } catch (err) {
    console.error("Register failed:", err);
  }
};
