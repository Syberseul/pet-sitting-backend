const { Platform } = require("../enum");
const { format, fromZonedTime, toZonedTime } = require("date-fns-tz");

const TIMEZONE = "Australia/Melbourne";

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

exports.getFormattedDate = (date = new Date()) => {
  const zonedTime = toZonedTime(new Date(date), TIMEZONE);
  return format(zonedTime, "yyyy-MM-dd'T'00:00:00", { timeZone: TIMEZONE });
};

exports.isValidDateSendingNotification = (startDate, endDate) => {
  if (!startDate || !endDate) return false;

  const todayStr = this.getFormattedDate().split("T")[0];
  const startStr = this.getFormattedDate(startDate).split("T")[0];
  const endStr = this.getFormattedDate(endDate).split("T")[0];

  const isStartAfterToday = startStr > todayStr;
  const isEndValid = endStr >= startStr;

  return isStartAfterToday && isEndValid;
};

exports.getNewNotificationTime = (dateTime) => {
  const zonedDate = toZonedTime(new Date(dateTime), TIMEZONE);

  // set notification time the day before dateTime at 7PM
  const reminderTime = new Date(zonedDate);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(19, 0, 0, 0);

  // // test
  // const reminderTime = new Date();
  // reminderTime.setMinutes(reminderTime.getMinutes() + 1);

  return fromZonedTime(
    format(reminderTime, "yyyy-MM-dd HH:mm:ss", { timeZone: TIMEZONE }),
    TIMEZONE
  );
};

exports.getEndNotificationTime = (dateTime) => {
  const zonedDate = toZonedTime(new Date(dateTime), TIMEZONE);

  // set notification time same as dateTime at 7AM
  const reminderTime = new Date(zonedDate);
  reminderTime.setHours(7, 0, 0, 0);

  // // test
  // const reminderTime = new Date();
  // reminderTime.setMinutes(reminderTime.getMinutes() + 1);

  return fromZonedTime(
    format(reminderTime, "yyyy-MM-dd HH:mm:ss", { timeZone: TIMEZONE }),
    TIMEZONE
  );
};
