const admin = require("firebase-admin");

const { db } = require("./index");
const { notificationStatus } = require("./enums");
const {
  getNotificationTime,
  isValidDateSendingNotification,
} = require("../utils/utilFunctions");

const scheduleNotifications = db.collection("scheduleNotifications");
const allDataList = db.collection("List");

class NotificationService {
  static async scheduleTourNotification(tourData) {
    if (!tourData.startDate || !tourData.endDate || !tourData.uid) return;

    // if startDate is before or equal to today, no need to schedule a notification for this tour
    if (!isValidDateSendingNotification(tourData.startDate, tourData.endDate))
      return;

    const notificationTime = getNotificationTime(tourData.startDate);

    const notificationRef = scheduleNotifications.doc();

    if (!tourData.uid) return;

    try {
      const notificationData = {
        tourId: tourData.uid,
        status: notificationStatus.PENDING,
        userId: null, // in the future maybe needed to determine which type of user would receive such notifications
        executeAt: admin.firestore.Timestamp.fromDate(notificationTime),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await notificationRef.set(notificationData);

      const AllNotificationsRef = allDataList.doc("AllNotifications") || [];
      const notificationId = notificationRef.id;

      await AllNotificationsRef.update({
        [notificationId]: { ...notificationData, uid: notificationId },
      });
    } catch (err) {
      console.log(err);
    }
  }

  static async updateTourNotification(tourId, newTourData) {
    if (!newTourData.startDate || !newTourData.endDate || !newTourData.uid)
      return;

    // if startDate is before or equal to today, no need to schedule a notification for this tour
    if (
      !isValidDateSendingNotification(
        newTourData.startDate,
        newTourData.endDate
      )
    )
      return;

    try {
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
        const notificationTime = getNotificationTime(newTourData.startDate);

        const updatedData = {
          ...snapshot.docs[0].data(),
          executeAt: admin.firestore.Timestamp.fromDate(notificationTime),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          status: notificationStatus.PENDING,
        };

        await snapshot.docs[0].ref.update(updatedData);

        await allDataList.doc("AllNotifications").update({
          [snapshot.docs[0].id]: updatedData,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  static async cancelTourNotification(tourId) {
    try {
      const snapshot = await scheduleNotifications
        .where("tourId", "==", tourId)
        .where("status", "in", [
          notificationStatus.PENDING,
          notificationStatus.PROCESSING,
        ])
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log("No active notifications found for tourId: ", tourId);
        return;
      }

      const notificationDoc = snapshot.docs[0];
      const notificationId = notificationDoc.id;

      const batch = db.batch();

      batch.update(notificationDoc.ref, {
        ...notificationDoc.data(),
        status: notificationStatus.CANCELLED,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const AllNotificationsRef = allDataList.doc("AllNotifications");

      batch.update(AllNotificationsRef, {
        [notificationId]: {
          ...notificationDoc.data(),
          status: notificationStatus.CANCELLED,
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      await batch.commit();
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = NotificationService;
