const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const JWT = promisify(jwt.sign);
const Verify = promisify(jwt.verify);

module.exports.createToken = async (userInfo) => {
  const shortToken = await JWT({ userInfo }, process.env.JWT_UUID, {
    expiresIn: 60 * 60, // 1 hour
    // expiresIn: 10, // 1 hour
  });
  const longToken = await JWT({ userInfo }, process.env.JWT_UUID, {
    expiresIn: 60 * 60 * 24 * 7, // 1 week
  });
  return { shortToken, longToken };
};

module.exports.verifyToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  const token = auth ? auth.split("Bearer ")[1] : null;

  if (!token) {
    res.status(402).json({ error: "Unauthorized" });
    return;
  }

  try {
    let userInfo = await Verify(token, process.env.JWT_UUID);
    req.user = userInfo;
    next();
  } catch (err) {
    if (err.message && err.message === "jwt expired") {
      return res.status(401).json({ error: "Token has expired" });
    }
    return res.status(402).json({ error: "Invalid token" });
  }
};
