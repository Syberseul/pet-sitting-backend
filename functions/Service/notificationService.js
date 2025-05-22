const admin = require("firebase-admin");

const { db, messaging } = require("../firebase");
const { notificationStatus } = require("../enums");

const scheduleNotifications = db.collection("scheduleNotifications");

class NotificationService {
  static async sendInstantNotification(message, data = {}) {
    try {
      const validUsers = await db
        .collection("User")
        .where("role", "in", [90, 100])
        .select("fcmTokens")
        .get();

      const tokens = validUsers.docs
        .map((doc) => doc.data().fcmTokens || [])
        .flat()
        .filter(
          (token) => !!token && typeof token === "string" && token.trim() !== ""
        );

      if (tokens.length === 0) {
        console.warn("No valid ADMIN FCM Token");
        return;
      }

      await messaging.sendEachForMulticast({
        tokens,
        notification: { title: "系统通知", body: message },
        data: {
          type: "admin_notification",
          ...data,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      });
    } catch (error) {
      console.error("Failed sending instant notification:", error);
    }
  }

  static async checkPendingNotifications() {
    const now = admin.firestore.Timestamp.now();
    const threshold = new admin.firestore.Timestamp(
      now.seconds + 3600, // 1小时窗口
      now.nanoseconds
    );

    // 1. search pending notifications
    const notifications = await scheduleNotifications
      .where("status", "==", notificationStatus.PENDING)
      .where("executeAt", "<=", threshold)
      .limit(100) // 防止超量
      .get();

    if (notifications.empty) {
      console.log("No pending notifications");
      return;
    }

    // 2. send notifications and update status
    const batch = db.batch();
    const tourIds = [];

    notifications.docs.forEach((doc) => {
      const { tourId } = doc.data();
      tourIds.push(tourId);
      batch.update(doc.ref, { status: notificationStatus.PROCESSING });
    });

    await batch.commit();

    // 3. get valid tours and send via grouped info
    const tours = await this.getTourDetails(tourIds);
    await this.sendGroupedNotification(tours);
  }

  static async getTourDetails(tourIds) {
    const snapshot = await db
      .collection("DogTours")
      .where(admin.firestore.FieldPath.documentId(), "in", tourIds)
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  static async sendGroupedNotification(tours) {
    if (tours.length === 0) return;

    // send to all ADMIN
    await this.sendInstantNotification(`您有 ${tours.length} 个行程即将开始`, {
      type: "tour_reminder",
      tourIds: JSON.stringify(tours.map((t) => t.id)),
    });

    // mark notification status as "completed"
    const batch = db.batch();
    const notifications = await scheduleNotifications
      .where(
        "tourId",
        "in",
        tours.map((t) => t.id)
      )
      .where("status", "==", notificationStatus.PROCESSING)
      .get();

    notifications.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: notificationStatus.COMPLETED,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

module.exports = NotificationService;
