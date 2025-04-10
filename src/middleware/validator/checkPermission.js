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

    if (role != 100) return res.status(403).json({ error: "Access denied" });

    next();
  } catch (err) {
    if (err.message && err.message === "jwt expired") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};
