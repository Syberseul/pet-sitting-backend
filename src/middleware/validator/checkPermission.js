const { UserRole } = require("../../enum");
const admin = require("firebase-admin");
const { db, auth } = require("../../Server");
const { dbCollectionName } = require("../../Server/enums/dbEnum");

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
        if (!customCheckResult) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      req.user = {
        uid: decodedToken.uid,
        role: userRole,
      };
      next();
    } catch (error) {
      if (error.code === "auth/id-token-expired")
        return res.status(401).json({ error: "Token expired" });

      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports.modifyDogs = modifyRule({
  allowedRoles: [UserRole.DOG_OWNER, UserRole.DEVELOPER, UserRole.ADMIN],
  customCheck: async (req, userId) => {
    if (req.userRole != UserRole.DOG_OWNER) return true;
    console.log("this is dog owner, need to check owner with dog's ownerId");
    return true;
  },
});

module.exports.modifyTours = modifyRule({
  allowedRoles: [UserRole.ADMIN, UserRole.DEVELOPER],
});

module.exports.modifyOwners = modifyRule({
  allowedRoles: [UserRole.DOG_OWNER, UserRole.DEVELOPER, UserRole.ADMIN],
  customCheck: async (req, userId) => {
    if (req.userRole != UserRole.DOG_OWNER) return true;
    console.log("this is dog owner, suppose to return its own info");
    return true;
  },
});
