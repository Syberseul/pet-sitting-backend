const { onSchedule } = require("firebase-functions/v2/scheduler");

const { log, error } = require("firebase-functions/logger");

const NotificationService = require("./Service/notificationService");

exports.checkNewNotifications = onSchedule(
  {
    schedule: "0 19 * * *", // run function everyday at 7pm
    // schedule: "every 30 minutes", // run function every 30 mins
    // schedule: "every 1 minutes", // test every 1 min
    timeoutSeconds: 300, // 5 mins timeout
    timeZone: "Australia/Melbourne",
    region: "australia-southeast1",
  },
  async () => {
    try {
      await NotificationService.checkPendingNewNotifications();
      log("Successfully triggered timer function for new notifications!");
    } catch (err) {
      error(
        `❌ Failed trigger timer function for new notifications: ${
          err?.message ?? "Unknown error"
        }`
      );
    }
  }
);

exports.checkEndNotifications = onSchedule(
  {
    schedule: "0 7 * * *", // run function everyday at 7am
    // schedule: "every 30 minutes", // run function every 30 mins
    // schedule: "every 1 minutes", // test every 1 min
    timeoutSeconds: 300, // 5 mins timeout
    timeZone: "Australia/Melbourne",
    region: "australia-southeast1",
  },
  async () => {
    try {
      await NotificationService.checkPendingEndNotifications();
      log("Successfully triggered timer function for end notifications!");
    } catch (err) {
      error(
        `❌ Failed trigger timer function for end notifications: ${
          err?.message ?? "Unknown error"
        }`
      );
    }
  }
);

exports.checkAndMarkToursToFinished = onSchedule(
  {
    schedule: "every day 00:01", // everyday at 00:01am
    // schedule: "every 1 minutes",
    timeoutSeconds: 300, // 5 mins timeout
    timeZone: "Australia/Melbourne",
    region: "australia-southeast1",
  },
  async () => {
    try {
      await NotificationService.checkAndMarkToursToFinish();
      log(
        "Successfully triggered timer function for check & mark tours to finished status!"
      );
    } catch (error) {
      error(
        `❌ Failed trigger timer function for check & mark tours to finished status: ${
          err?.message ?? "Unknown error"
        }`
      );
    }
  }
);
