const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const JWT = promisify(jwt.sign);
// const Verify = promisify(jwt.verify);
const admin = require("firebase-admin");
const { UserRole } = require("../enum");

module.exports.createToken = async (userInfo) => {
  // shortToken will be replaced by Firebase ID Token, for custom claims purpose, which will contain user role as reference
  // in order to reduce the number of db access while doing user permission check
  // const shortToken = await JWT({ userInfo }, process.env.JWT_UUID, {
  //   expiresIn: 60 * 60, // 1 hour
  //   // expiresIn: 10, // 1 hour
  // });
  const longToken = await JWT({ userInfo }, process.env.JWT_UUID, {
    expiresIn: 60 * 60 * 24 * 7, // 1 week
  });
  // return { shortToken, longToken };
  return { longToken };
};

module.exports.verifyToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth ? auth.split("Bearer ")[1] : null;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // let userInfo = await Verify(token, process.env.JWT_UUID);
    // req.user = userInfo;
    // next();
    const decoded = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      role: decoded.role || UserRole.VISITOR,
      isTokenFresh: true,
    };

    next();
  } catch (err) {
    // if (err.message && err.message === "jwt expired") {
    //   return res.status(401).json({ error: "Token has expired" });
    // }
    if (err.code == "auth/id-token-expired") {
      return res.status(401).json({ error: "Token has expired" });
    }

    console.error("Token verification error: ", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
