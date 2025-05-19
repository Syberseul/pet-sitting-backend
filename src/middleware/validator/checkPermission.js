const { UserRole } = require("../../enum");
const { db, auth } = require("../../Server");

module.exports.modifyDogs = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.split("Bearer ")[1] : null;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const userRef = db.collection("User");
    const snapshot = await userRef.where("token", "==", token).limit(1).get();

    if (snapshot.empty) return res.status(403).json({ error: "Access denied" });

    const { role } = snapshot.docs[0].data();

    if (role == UserRole.VISITOR) {
      return res.status(403).json({ error: "Access denied" });
    } else if (role == UserRole.ADMIN || role == UserRole.DEVELOPER) {
      next();
      return;
    } else if (role == UserRole.DOG_OWNER) {
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
