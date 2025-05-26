const { UserRole } = require("../../enum");
const admin = require("firebase-admin");
const { db, auth } = require("../../Server");
const { dbCollectionName } = require("../../Server/enums/dbEnum");

module.exports.modifyDogs = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split("Bearer ")[1] : null;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // const userRef = db.collection(dbCollectionName.USER);
    // const snapshot = await userRef.where("token", "==", token).limit(1).get();
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userRole = decodedToken.role || UserRole.VISITOR;

    // if (snapshot.empty) return res.status(403).json({ error: "Access denied" });

    // const { role } = snapshot.docs[0].data();

    if (userRole == UserRole.VISITOR) {
      return res.status(403).json({ error: "Access denied" });
    } else if (userRole == UserRole.ADMIN || role == UserRole.DEVELOPER) {
      next();
      return;
    } else if (userRole == UserRole.DOG_OWNER) {
      // TODO: check owners dog list and return 403 if dog id that trying to modify is not belong to this owner
      next();
      return;
    } else return res.status(403).json({ error: "Access denied" });
  } catch (err) {
    if (err.message && err.message === "jwt expired") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
