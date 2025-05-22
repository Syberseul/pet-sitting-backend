const { onSchedule } = require("firebase-functions/v2/scheduler");

const { log, error } = require("firebase-functions/logger");

const NotificationService = require("./Service/notificationService");

exports.checkNotifications = onSchedule(
  {
    schedule: "every 30 minutes", // run function every 30 mins
    // schedule: "every 1 minutes", // test every 1 min
    timeoutSeconds: 300, // 5 mins timeout
    timeZone: "Australia/Melbourne",
    region: "australia-southeast1",
  },
  async () => {
    try {
      await NotificationService.checkPendingNotifications();
      log("Successfully triggered timer function!");
    } catch (err) {
      error(
        `❌ Failed trigger timer function: ${err?.message ?? "Unknown error"}`
      );
    }
  }
);
