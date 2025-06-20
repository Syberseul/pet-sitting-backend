const admin = require("firebase-admin");

const { error, log } = require("firebase-functions/logger");

const { db, messaging } = require("../firebase");
const {
  notificationStatus,
  dbCollectionName,
  dbCollectionDocName,
} = require("../enums");

const ScheduledNewTourNotifications = db.collection(
  dbCollectionName.NEW_TOUR_NOTIFICATIONS
);
const ScheduledEndTourNotifications = db.collection(
  dbCollectionName.END_TOUR_NOTIFICATIONS
);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const tourCollection = db.collection(dbCollectionName.DOG_TOUR);

const LIMIT_SENDING_NOTIFICATIONS = 100;

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

  static async checkPendingNewNotifications() {
    const now = admin.firestore.Timestamp.now();
    const threshold = new admin.firestore.Timestamp(
      now.seconds + 300, // 5分钟时间窗口
      now.nanoseconds
    );

    try {
      const allNotificationsDoc = await allDataList
        .doc(dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS)
        .get();

      if (!allNotificationsDoc.exists) {
        error("AllNewTourNotifications document does not exist!");
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
        .slice(0, LIMIT_SENDING_NOTIFICATIONS);

      if (pendingNotifications.length == 0) {
        log("No pending NEW notifications");
        return;
      }

      const tourIds = [];
      const scheduleNotificationRefs = [];

      pendingNotifications.forEach(([id, notification]) => {
        tourIds.push(notification.tourId);
        scheduleNotificationRefs.push(ScheduledNewTourNotifications.doc(id));
        allNotifications[id].status = notificationStatus.PROCESSING;
      });

      const batch = db.batch();

      scheduleNotificationRefs.forEach((ref) => {
        batch.update(ref, { status: notificationStatus.PROCESSING });
      });

      batch.update(
        allDataList.doc(dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS),
        {
          ...allNotifications,
        }
      );

      await batch.commit();

      const tours = await this.getTourDetails(tourIds);
      await this.sendGroupedNewNotification(tours);
    } catch (err) {
      error(`Failed check pending NEW notifications: ${err}`);
    }
  }

  static async checkPendingEndNotifications() {
    const now = admin.firestore.Timestamp.now();
    const threshold = new admin.firestore.Timestamp(
      now.seconds + 300,
      now.nanoseconds
    );

    try {
      const allNotificationsDoc = await allDataList
        .doc(dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS)
        .get();

      if (!allNotificationsDoc.exists) {
        error("AllEndTourNotifications document does not exist!");
        return;
      }

      const allNotifications = allNotificationsDoc.data() || {};

      const pendingNotifications = Object.entries(allNotifications)
        .filter(
          ([id, notification]) =>
            notification.status == notificationStatus.PENDING &&
            notification.executeAt <= threshold
        )
        .slice(0, LIMIT_SENDING_NOTIFICATIONS);

      if (pendingNotifications.length == 0) {
        log("No pending END notifications");
        return;
      }

      const tourIds = [];
      const scheduleNotificationRefs = [];

      pendingNotifications.forEach(([id, notification]) => {
        tourIds.push(notification.tourId);
        scheduleNotificationRefs.push(ScheduledEndTourNotifications.doc(id));
        allNotifications[id].status = notificationStatus.PROCESSING;
      });

      const batch = db.batch();

      scheduleNotificationRefs.forEach((ref) => {
        batch.update(ref, { status: notificationStatus.PROCESSING });
      });

      batch.update(
        allDataList.doc(dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS),
        {
          ...allNotifications,
        }
      );

      await batch.commit();

      const tours = await this.getTourDetails(tourIds);
      await this.sendGroupedEndNotification(tours);
    } catch (err) {
      error(`Failed check pending END notifications: ${err}`);
    }
  }

  static async checkAndMarkToursToFinish() {
    try {
      const allToursDoc = await allDataList
        .doc(dbCollectionDocName.ALL_TOURS)
        .get();
      if (!allToursDoc.exists) {
        console.error("AllTours document does not exist!");
        return;
      }

      const allTours = allToursDoc.data() || {};

      const isEndDateBeforeToday = (date) => {
        if (!date) return true;
        const parts = date.split("-");
        if (parts.length !== 3) return true;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        inputDate.setHours(0, 0, 0, 0);
        return inputDate < today;
      };

      const toursToUpdate = Object.entries(allTours)
        .filter(([id, tour]) => {
          return (
            (!tour.hasOwnProperty("status") || tour.status !== 2) &&
            isEndDateBeforeToday(tour.endDate)
          );
        })
        .map(([id, tour]) => ({ id, ...tour }));

      if (toursToUpdate.length === 0) {
        console.log("No tours need to be marked as Finished");
        return;
      }

      const batch = db.batch();
      const relatedTourIds = [];

      for (const tour of toursToUpdate) {
        const tourRef = tourCollection.doc(tour.id);
        const updatedData = {
          ...tour,
          status: 2,
        };

        batch.update(tourRef, updatedData);

        const allToursRef = allDataList.doc(dbCollectionDocName.ALL_TOURS);
        batch.update(allToursRef, {
          [`${tour.id}`]: updatedData,
        });

        relatedTourIds.push(tour.id);
      }

      await batch.commit();

      await NotificationService.completeTourNotification(relatedTourIds);

      console.log(
        `Successfully marked ${toursToUpdate.length} tours as Finished.`
      );
    } catch (error) {
      console.error(`Failed to check and mark tours as Finished: ${error}`);
    }
  }

  static async getTourDetails(tourIds) {
    if (!tourIds?.length) return [];

    const allTours = await allDataList.doc(dbCollectionDocName.ALL_TOURS).get();

    if (!allTours.exists) {
      log("AllTours document does not exist!");
      return [];
    }

    const allToursData = allTours.data() || {};

    const targetTours = Object.entries(allToursData)
      .filter(([id, tourData]) =>
        tourIds.some(
          (tourId) => tourId == id || tourId.toString() == id.toString()
        )
      )
      .map(([id, tourData]) => ({
        ...tourData,
        id,
      }));

    return targetTours;
  }

  static async sendGroupedNewNotification(tours) {
    if (tours.length === 0) return;

    const tourIds = tours.map((t) => t.id);

    // send to all ADMIN
    await this.sendInstantNotification(`您有 ${tours.length} 个行程即将开始`, {
      type: "tour_reminder",
      tourIds: JSON.stringify(tourIds),
    });

    await this.completeTourNotification(tourIds);
  }

  static async sendGroupedEndNotification(tours) {
    if (tours.length === 0) return;

    const tourIds = tours.map((t) => t.id);

    // send to all ADMIN
    await this.sendInstantNotification(`您有 ${tours.length} 个行程即将结束`, {
      type: "tour_reminder",
      tourIds: JSON.stringify(tourIds),
    });

    await this.completeTourNotification(tourIds);
  }

  static async completeTourNotification(tourIds) {
    if (!tourIds?.length) return;

    const _getCollection = () => {
      const hours = new Date().getHours();

      return hours < 12
        ? ScheduledNewTourNotifications
        : ScheduledEndTourNotifications;
    };

    const _getDocName = () => {
      const hours = new Date().getHours();
      return hours < 12
        ? dbCollectionDocName.ALL_NEW_TOUR_NOTIFICATIONS
        : dbCollectionDocName.ALL_END_TOUR_NOTIFICATIONS;
    };

    try {
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      const collectionRef = _getCollection();
      const collectionDocName = _getDocName();

      const snapshot = await collectionRef
        .where("tourId", "in", tourIds)
        .where("status", "==", notificationStatus.PROCESSING)
        .get();

      if (snapshot.empty) {
        log("No notifications to complete");
        return;
      }

      const baseCompletedData = {
        status: notificationStatus.COMPLETED,
        completedAt: now,
        lastUpdated: now,
      };

      const summaryRef = allDataList.doc(collectionDocName);
      const processedTours = new Set();

      snapshot.docs.forEach((doc) => {
        const tourId = doc.data().tourId;

        if (processedTours.has(tourId)) return;

        const completedData = {
          ...doc.data(),
          ...baseCompletedData,
        };

        batch.update(doc.ref, completedData);
        batch.update(summaryRef, {
          [doc.id]: completedData,
        });

        processedTours.add(tourId);
      });

      await batch.commit();
    } catch (err) {
      error("Failed change notification status to COMPLETE: ", err);
    }
  }
}

module.exports = NotificationService;
