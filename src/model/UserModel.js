const { UserRole } = require("../enum");

module.exports.DefaultUserInfo = Object.freeze({
  createdAt: new Date().getTime(),
  role: UserRole.VISITOR,

  id: "",
  email: "",
  userName: "",
  wxId: "",
  googleId: "",
  githubId: "",
  isFromWx: false,
});

module.exports.DogOwnerInfo = Object.freeze({
  createdAt: new Date().getTime(),

  userId: "", // link to User.uid,
  name: "",
  dogs: [], // save dogs - DogModel.DogInfo
  contactNo: "",
  isFromWx: false,
  wxId: "",
});
