const admin = require("firebase-admin");

const { db, messaging } = require("./index");
const { notificationStatus } = require("./enums");
const {
  getNewNotificationTime,
  getEndNotificationTime,
  isValidDateSendingNotification,
} = require("../utils/utilFunctions");
const { dbCollectionName, dbCollectionDocName } = require("./enums/dbEnum");
const { UserRole } = require("../enum");

const ScheduledNewTourNotifications = db.collection(
  dbCollectionName.NEW_TOUR_NOTIFICATIONS
);
const ScheduledEndTourNotifications = db.collection(
  dbCollectionName.END_TOUR_NOTIFICATIONS
);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);

class NotificationService {
  static validRoles = [UserRole.ADMIN, UserRole.DEVELOPER];

  static async scheduleTourNotification(tourData) {
    if (!tourData.startDate || !tourData.endDate || !tourData.uid) return;

    // if startDate is before or equal to today, no need to schedule a notification for this tour
    if (!isValidDateSendingNotification(tourData.startDate, tourData.endDate))
      return;

    try {
      const newNotificationTime = getNewNotificationTime(tourData.startDate);
      const endNotificationTime = getEndNotificationTime(tourData.endDate);
      const batch = db.batch();

      // create notification doc reference
      const newNotificationRef = ScheduledNewTourNotifications.doc();
      const endNotificationRef = ScheduledEndTourNotifications.doc();

      // prepare notification data
      const baseNotificationData = {
        tourId: tourData.uid,
        status: notificationStatus.PENDING,
        userId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const newNotificationData = {
        ...baseNotificationData,
        executeAt: admin.firestore.Timestamp.fromDate(newNotificationTime),
        uid: newNotificationRef.id,
      };
      const endNotificationData = {
        ...baseNotificationData,
        executeAt: admin.firestore.Timestamp.fromDate(endNotificationTime),
        uid: endNotificationRef.id,
      };

      // create notification directly to relevant document
      batch.set(newNotificationRef, newNotificationData);
      batch.set(endNotificationRef, endNotificationData);

      const AllNewNotificationsRef = allDataList.doc(
        dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS
      );
      const AllEndNotificationsRef = allDataList.doc(
        dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS
      );

      // create notification to all-in-one document
      batch.set(AllNewNotificationsRef, {
        [newNotificationRef.id]: newNotificationData,
      });
      batch.set(AllEndNotificationsRef, {
        [endNotificationRef.id]: endNotificationData,
      });

      await batch.commit();
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
      const newNotificationTime = getNewNotificationTime(newTourData.startDate);
      const endNotificationTime = getEndNotificationTime(newTourData.endDate);
      const batch = db.batch();

      const [newNotificationSnapshot, endNotificationSnapshot] =
        await Promise.all([
          ScheduledNewTourNotifications.where("tourId", "==", tourId)
            .where("status", "in", [
              notificationStatus.PENDING,
              notificationStatus.CANCELLED,
            ])
            .limit(1)
            .get(),
          ScheduledEndTourNotifications.where("tourId", "==", tourId)
            .where("status", "in", [
              notificationStatus.PENDING,
              notificationStatus.CANCELLED,
            ])
            .limit(1)
            .get(),
        ]);

      const baseUpdatedNotificationData = {
        status: notificationStatus.PENDING,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newNotificationSnapshot.empty && endNotificationSnapshot.empty)
        return this.scheduleTourNotification(newTourData);

      if (!newNotificationSnapshot.empty) {
        const newNotificationDoc = newNotificationSnapshot.docs[0];
        const updatedNewNotificationData = {
          ...newNotificationDoc.data(),
          ...baseUpdatedNotificationData,
          executeAt: admin.firestore.Timestamp.fromDate(newNotificationTime),
        };
        // update new notification to its relevant document
        batch.update(newNotificationDoc.ref, updatedNewNotificationData);
        // update new notification to all-in-one document
        batch.update(
          allDataList.doc(dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS),
          {
            [newNotificationDoc.id]: updatedNewNotificationData,
          }
        );
      }

      if (!endNotificationSnapshot.empty) {
        const endNotificationDoc = endNotificationSnapshot.docs[0];
        const updatedEndNotificationData = {
          ...endNotificationDoc.data(),
          ...baseUpdatedNotificationData,
          executeAt: admin.firestore.Timestamp.fromDate(endNotificationTime),
        };
        // update end notification to its relevant document
        batch.update(endNotificationDoc.ref, updatedEndNotificationData);
        // update end notification to all-in-one document
        batch.update(
          allDataList.doc(dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS),
          {
            [endNotificationDoc.id]: updatedEndNotificationData,
          }
        );
      }

      await batch.commit();
    } catch (err) {
      console.log(err);
    }
  }

  static async cancelTourNotification(tourId) {
    if (!tourId) return;

    try {
      const now = admin.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();

      const [newNotificationSnapshot, endNotificationSnapshot] =
        await Promise.all([
          ScheduledNewTourNotifications.where("tourId", "==", tourId)
            .where("status", "in", [
              notificationStatus.PENDING,
              notificationStatus.PROCESSING,
            ])
            .limit(1)
            .get(),
          ScheduledEndTourNotifications.where("tourId", "==", tourId)
            .where("status", "in", [
              notificationStatus.PENDING,
              notificationStatus.PROCESSING,
            ])
            .limit(1)
            .get(),
        ]);

      const allDocsToCancel = [
        ...newNotificationSnapshot.docs,
        ...endNotificationSnapshot.docs,
      ];

      if (allDocsToCancel.length == 0) {
        console.log(`No active notifications found for tour: ${tourId}`);
        return;
      }

      const baseCancelledNotificationData = {
        status: notificationStatus.CANCELLED,
        lastUpdated: now,
        cancelledAt: now,
      };

      allDocsToCancel.forEach((doc) => {
        const collectionName = doc.ref.parent.id;
        const summaryDocRef = allDataList.doc(
          collectionName == dbCollectionName.NEW_TOUR_NOTIFICATIONS
            ? dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS
            : dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS
        );

        const cancelledNotificationData = {
          ...doc.data(),
          ...baseCancelledNotificationData,
        };

        // cancel notification to its relevant document
        batch.update(doc.ref, cancelledNotificationData);
        // cancel notification to its related all-in-one document
        batch.update(summaryDocRef, {
          [doc.id]: cancelledNotificationData,
        });
      });

      await batch.commit();
    } catch (err) {
      console.log(err);
    }
  }

  static async sendNotificationWhenTourCancelled(tourId) {
    if (!tourId) return;

    try {
    } catch (error) {
      console.log(error);
    }
  }

  static async sendInstantNotification(message, data = {}) {
    const roles = data.roles || this.validRoles;

    try {
      const validUsers = await db
        .collection("User")
        .where("role", "in", roles)
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
}

module.exports = NotificationService;
