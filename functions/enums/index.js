const notificationStatus = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const dbCollectionName = Object.freeze({
  NEW_TOUR_NOTIFICATIONS: "ScheduledNewTourNotifications",
  END_TOUR_NOTIFICATIONS: "ScheduledEndTourNotifications",
  ALL_DATA_LIST: "List",
  DOG_OWNER: "DogOwner",
  DOG_TOUR: "DogTours",
  USER: "User",
});

const dbCollectionDocName = Object.freeze({
  ALL_NEW_TOUR_NOTIFICATIONS: "AllNewTourNotifications",
  ALL_END_TOUR_NOTIFICATIONS: "AllEndTourNotifications",
  ALL_TOURS: "AllTours",
  ALL_DOG_OWNERS: "AllDogOwners",
  ALL_USERS: "AllUsers",
});

module.exports = { notificationStatus, dbCollectionName, dbCollectionDocName };
