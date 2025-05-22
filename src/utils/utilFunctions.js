const { Platform } = require("../enum");
const { format } = require("date-fns-tz");

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

exports.getNotificationTime = (dateTime) => {
  const reminderTime = new Date(dateTime);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(20, 0, 0, 0);

  const formattedDate = format(reminderTime, "yyyy-MM-dd HH:mm:ss", {
    timeZone: "Australia/Melbourne",
  });

  return new Date(formattedDate);
};
