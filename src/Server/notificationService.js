const admin = require("firebase-admin");

const { db, messaging } = require("./index");
const { notificationStatus } = require("./enums");

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
      await this.cancelTourNotification(newTourData.uid);
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
}

module.exports = NotificationService;
