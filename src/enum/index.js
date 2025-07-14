const UserRole = Object.freeze({
  ADMIN: 100,
  DEVELOPER: 90,
  DOG_OWNER: 10,
  VISITOR: 0,
});

const Platform = Object.freeze({
  WEB: "WEB",
  WX: "wxMiniProject",
});

const AuthPlatform = Object.freeze({
  EMAIL: "email",
  WX: "wxMiniProject",
  GOOGLE: "google",
  GITHUB: "github",
});

const TourStatus = Object.freeze({
  PENDING: 0,
  DELIVERED: 1,
  FINISHED: 2,
  PENDING_APPROVAL: 3,
  RECEIVING_APPROVED: 4,
});

module.exports = { UserRole, Platform, AuthPlatform, TourStatus };
