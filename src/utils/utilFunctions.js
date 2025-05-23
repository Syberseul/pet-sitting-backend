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

exports.getFormattedDate = (date = new Date()) => {
  const dateTime = new Date(date);
  const year = dateTime.getFullYear();
  const month = (dateTime.getMonth() + 1).toString().padStart(2, "0");
  const day = dateTime.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}T00:00:00`;
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
  // set notification time the day before dateTime at 7PM
  const reminderTime = new Date(dateTime);
  reminderTime.setDate(reminderTime.getDate() - 1);
  reminderTime.setHours(19, 0, 0, 0);

  // // test
  // const reminderTime = new Date();
  // reminderTime.setMinutes(reminderTime.getMinutes() + 1);

  const formattedDate = format(reminderTime, "yyyy-MM-dd HH:mm:ss", {
    timeZone: "Australia/Melbourne",
  });

  return new Date(formattedDate);
};

exports.getEndNotificationTime = (dateTime) => {
  // set notification time same as dateTime at 7AM
  const reminderTime = new Date(dateTime);
  reminderTime.setHours(7, 0, 0, 0);

  // // test
  // const reminderTime = new Date();
  // reminderTime.setMinutes(reminderTime.getMinutes() + 1);

  const formattedDate = format(reminderTime, "yyyy-MM-dd HH:mm:ss", {
    timeZone: "Australia/Melbourne",
  });

  return new Date(formattedDate);
};
