const { UserRole } = require("../enum");

module.exports.DefaultUserInfo = {
  createdAt: new Date().getTime(),
  role: UserRole.VISITOR,

  id: "",
  email: "",
  userName: "",
  wxId: "",
  googleId: "",
  githubId: "",
  isFromWx: false,
};
