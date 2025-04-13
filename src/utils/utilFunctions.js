const { Platform } = require("../enum");

exports.interError = (res, err) =>
  res.status(500).json({
    error: err.message || "Internal Error",
    code: 500,
  });

exports.isWxPlatform = (req) => req.headers.platform == Platform.WX;

exports.missingWxProperty = (res) =>
  res.status(400).json({
    error: "Missing wx auth property",
    code: 400,
  });
