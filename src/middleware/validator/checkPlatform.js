const { Platform } = require("../../enum");

require("dotenv").config();

module.exports.verifyPlatform = (req, res, next) => {
  const platform = req.headers.platform;

  if (!platform)
    return res.status(403).json({
      error: "Unspecified platform",
      code: 403,
    });

  if (platform == Platform.WX) {
    const wxUUID = req.headers["wx_uuid"];
    if (!wxUUID || wxUUID !== process.env.WX_UUID)
      return res.status(403).json({
        error: "Unknown project",
        code: 403,
      });
  }

  next();
};
