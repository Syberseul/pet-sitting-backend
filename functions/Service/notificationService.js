const admin = require("firebase-admin");

const { db, messaging } = require("../firebase");
const { notificationStatus } = require("../enums");

const scheduleNotifications = db.collection("scheduleNotifications");

class NotificationService {
  static async scheduleTourNotification(tourData) {
    if (!tourData.startDate || !tourData.endDate || !tourData.uid) return;

    const today = new Date();
    const endDate = new Date(tourData.endDate);

    // if endDate is before today, no need to schedule a notification for this tour
    if (endDate < today) return;

    // set reminder time to the day before start date at 8pm
    const reminderTime = new Date(tourData.startDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    reminderTime.setHours(20, 0, 0, 0);

    const notificationRef = scheduleNotifications.doc(tourData.uid);

    // TODO: make sure here tourData has valid uid
    await notificationRef.set({
      tourId: tourData.uid,
      status: notificationStatus.PENDING,
      userId: null, // in the future maybe needed to determine which type of user would receive such notifications
      executeAt: admin.firestore.Timestamp.fromDate(reminderTime),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return notificationRef.id;
  }

  static async updateTourNotification(tourId, newTourData) {
    if (!newTourData.startDate || !newTourData.endDate || !newTourData.uid)
      return;

    const today = new Date();
    const endDate = new Date(newTourData.endDate);

    // if endDate is before today, no need to update notification time of this tour, instead need to cancel this notification
    if (endDate < today) {
      await cancelTourNotification(newTourData.uid);
      return;
    }

    const snapshot = await scheduleNotifications
      .where("tourId", "==", tourId)
      .where("status", "in", [
        notificationStatus.PENDING,
        notificationStatus.CANCELLED,
      ])
      .limit(1)
      .get();

    if (snapshot.empty) {
      return this.scheduleTourNotification(newTourData);
    } else {
      const reminderTime = new Date(newTourData.startDate);
      reminderTime.setDate(reminderTime.getDate() - 1);
      reminderTime.setHours(20, 0, 0, 0);

      await snapshot.docs[0].ref.update({
        executeAt: admin.firestore.Timestamp.fromDate(reminderTime),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        status: notificationStatus.PENDING,
      });
    }
  }

  static async cancelTourNotification(tourId) {
    const batch = db.batch();
    const notifications = await scheduleNotifications
      .where("tourId", "==", tourId)
      .where("status", "in", [
        notificationStatus.PENDING,
        notificationStatus.PROCESSING,
      ])
      .get();

    notifications.forEach((doc) => {
      batch.update(doc.ref, {
        status: notificationStatus.CANCELLED,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
  }

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
