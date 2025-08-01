const { UserRole } = require("../../enum");
const admin = require("firebase-admin");

const modifyRule = (options = { allowedRoles: [], customCheck: null }) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split("Bearer ")[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userRole = decodedToken.role || UserRole.VISITOR;

      if (
        options.allowedRoles?.length &&
        !options.allowedRoles.includes(userRole)
      )
        return res.status(403).json({ error: "Access denied" });

      if (options.customCheck) {
        const customCheckResult = await options.customCheck({
          req,
          userRole,
          userId: decodedToken.uid,
        });
        if (!customCheckResult)
          return res.status(403).json({ error: "Access denied" });
      }

      req.user = {
        uid: decodedToken.uid,
        role: userRole,
      };
      next();
    } catch (error) {
      if (error.code === "auth/id-token-expired")
        return res.status(401).json({ error: "Token has expired" });

      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

// Owner Permissions
module.exports.checkGetOwnerById = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DOG_OWNER],
  customCheck: async ({ req, userRole, userId }) => {
    if (userRole != UserRole.DOG_OWNER) return true;
    const { id } = req.params;
    return id && id === userId;
  },
});

module.exports.checkGetAllOwners = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER],
});

module.exports.checkCreateOwner = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.VISITOR],
});

module.exports.checkUpdateOwner = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DOG_OWNER],
  customCheck: async ({ req, userRole, userId }) => {
    if ([UserRole.ADMIN, UserRole.DEVELOPER].includes(userRole)) return true;
    const { id } = req.params;
    return id && id === userId;
  },
});

// Dogs Permissions
module.exports.checkModifyDog = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DOG_OWNER],
  customCheck: async ({ req, userRole, userId }) => {
    if (userRole != UserRole.DOG_OWNER) return true;
    const { ownerId } = req.body;
    return ownerId && ownerId === userId;
  },
});

// Tours Permissions
module.exports.checkGetAllTours = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DOG_OWNER],
});

module.exports.checkModifyTour = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.DOG_OWNER],
  customCheck: async ({ req, userRole, userId }) => {
    if (userRole != UserRole.DOG_OWNER) return true;
    const { ownerId } = req.body;
    return ownerId && ownerId === userId;
  },
});

module.exports.adminONLY = modifyRule({
  allowedRoles: [UserRole.ADMIN],
});

// Users Permissions
module.exports.checkGetAllUsers = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER],
});

module.exports.updateUserInfo = modifyRule({
  allowedRoles: [
    UserRole.ADMIN,
    UserRole.DEVELOPER,
    UserRole.DOG_OWNER,
    UserRole.VISITOR,
  ],
  customCheck: async ({ req, userRole, userId }) => {
    if ([UserRole.ADMIN, UserRole.DEVELOPER].includes(userRole)) return true;
    const { id } = req.params;
    return userId && userId === id;
  },
});
