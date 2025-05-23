const admin = require("firebase-admin");

const { error, log } = require("firebase-functions/logger");

const { db, messaging } = require("../firebase");
const { notificationStatus } = require("../enums");

const scheduleNotifications = db.collection("scheduleNotifications");
const allDataList = db.collection("List");

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
      now.seconds + 300, // 5分钟时间窗口
      now.nanoseconds
    );

    try {
      const allNotificationsDoc = await allDataList
        .doc("AllNotifications")
        .get();

      if (!allNotificationsDoc.exists) {
        error("AllNotifications document does not exist!");
        return;
      }

      const allNotifications = allNotificationsDoc.data() || {};

      // limit send pending notifications to 100
      const pendingNotifications = Object.entries(allNotifications)
        .filter(
          ([id, notification]) =>
            notification.status == notificationStatus.PENDING &&
            notification.executeAt <= threshold
        )
        .slice(0, 100);

      if (pendingNotifications.length == 0) {
        log("No pending notifications");
        return;
      }

      const tourIds = [];
      const scheduleNotificationRefs = [];

      pendingNotifications.forEach(([id, notification]) => {
        tourIds.push(notification.tourId);
        scheduleNotificationRefs.push(scheduleNotifications.doc(id));
        allNotifications[id].status = notificationStatus.PROCESSING;
      });

      const batch = db.batch();

      scheduleNotificationRefs.forEach((ref) => {
        batch.update(ref, { status: notificationStatus.PROCESSING });
      });

      batch.update(allDataList.doc("AllNotifications"), {
        ...allNotifications,
      });

      await batch.commit();

      const tours = await this.getTourDetails(tourIds);
      await this.sendGroupedNotification(tours);
    } catch (err) {
      error(`Failed check pending notifications: ${err}`);
    }
  }

  // static async checkPendingNotifications() {
  //   const now = admin.firestore.Timestamp.now();
  //   const threshold = new admin.firestore.Timestamp(
  //     now.seconds + 300, // 5分钟时间窗口
  //     now.nanoseconds
  //   );

  //   // 1. search pending notifications
  //   const notifications = await scheduleNotifications
  //     .where("status", "==", notificationStatus.PENDING)
  //     .where("executeAt", "<=", threshold)
  //     .limit(100) // 防止超量
  //     .get();

  //   if (notifications.empty) {
  //     console.log("No pending notifications");
  //     return;
  //   }

  //   // 2. send notifications and update status
  //   const batch = db.batch();
  //   const tourIds = [];

  //   notifications.docs.forEach((doc) => {
  //     const { tourId } = doc.data();
  //     tourIds.push(tourId);
  //     batch.update(doc.ref, { status: notificationStatus.PROCESSING });
  //   });

  //   await batch.commit();

  //   // 3. get valid tours and send via grouped info
  //   const tours = await this.getTourDetails(tourIds);
  //   await this.sendGroupedNotification(tours);
  // }

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

    const allNotificationsRef = allDataList.doc("AllNotifications");
    const updates = {};

    tours.forEach((tour) => {
      updates[`${tour.id}.status`] = notificationStatus.COMPLETED;
      updates[`${tour.id}.completedAt`] =
        admin.firestore.FieldValue.serverTimestamp();
    });

    await allNotificationsRef.update(updates);
  }

  // static async sendGroupedNotification(tours) {
  //   if (tours.length === 0) return;

  //   // send to all ADMIN
  //   await this.sendInstantNotification(`您有 ${tours.length} 个行程即将开始`, {
  //     type: "tour_reminder",
  //     tourIds: JSON.stringify(tours.map((t) => t.id)),
  //   });

  //   // mark notification status as "completed"
  //   const notifications = await scheduleNotifications
  //     .where(
  //       "tourId",
  //       "in",
  //       tours.map((t) => t.id)
  //     )
  //     .where("status", "==", notificationStatus.PROCESSING)
  //     .get();

  //   notifications.docs.forEach((doc) => {
  //     batch.update(doc.ref, {
  //       status: notificationStatus.COMPLETED,
  //       completedAt: admin.firestore.FieldValue.serverTimestamp(),
  //     });
  //   });

  //   await batch.commit();
  // }
}

module.exports = NotificationService;
