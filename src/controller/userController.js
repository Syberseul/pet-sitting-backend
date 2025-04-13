const { db, auth } = require("../Server");

const { Platform, UserRole } = require("../enum");

const { DefaultUserInfo } = require("../model/UserModel");

const { createToken } = require("../utils/jwt");

const { hashPwd, verifyPassword } = require("../utils/pwdUtils");

const userCollection = db.collection("User");

exports.register = async (req, res) => {
  try {
    const isWxPlatform = req.headers.platform == Platform.WX;

    const { email, password, userName, wxId, googleId, githubId } = req.body;

    let userRecord;

    if (isWxPlatform && !wxId)
      return res.status(400).json({
        error: "Missing auth property",
        code: 400,
      });

    const isEmailAuth = !wxId && !googleId && !githubId;

    if (isEmailAuth) {
      if (!email || !password)
        return res.status(400).json({
          error: "Missing email or password",
          code: 400,
        });
      userRecord = await auth.createUser({
        email,
        password: hashPwd(password),
        emailVerified: false,
      });
    } else {
      const uid = wxId
        ? `wx_${wxId}`
        : googleId
        ? `google_${googleId}`
        : githubId
        ? `github_${githubId}`
        : undefined;

      if (!uid)
        return res.status(400).json({
          error: "Missing platform id",
          code: 400,
        });

      try {
        userRecord = await auth.getUser(uid);
      } catch (error) {
        userRecord = await auth.createUser({ uid });
      }
    }

    // custom token for wxMiniProject
    const customToken = await auth.createCustomToken(userRecord.uid);

    const { shortToken, longToken } = await createToken();

    const userRef = userCollection.doc(userRecord.uid);

    const userData = {
      ...DefaultUserInfo,
      id: userRecord.uid,
      email: email || "",
      userName: userName || "",
      wxId: wxId || "",
      googleId: googleId || "",
      githubId: githubId || "",
      isFromWx: isWxPlatform,
      token: shortToken,
      refreshToken: longToken,
      lastLogin: new Date().getTime(),
    };

    if (isEmailAuth) userData.password = hashPwd(password);

    await userRef.set(userData);

    return res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      userName,
      token: shortToken,
      refreshToken: longToken,
      role: UserRole.VISITOR,
      customToken,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Error",
      code: 500,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, wxId, googleId, githubId } = req.body;
    const isWxPlatform = req.headers.platform === Platform.WX;

    const isEmailLogin = !wxId && !googleId && !githubId;

    let userDoc, userData;

    if (isEmailLogin) {
      if (!email || !password) {
        return res.status(400).json({
          error: "Email and password are required.",
          code: 400,
        });
      }

      const snapshot = await userCollection
        .where("email", "==", email)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(401).json({
          error: "Invalid email or password",
          code: 401,
        });
      }

      userDoc = snapshot.docs[0];
      userData = userDoc.data();

      const isPwdValid = verifyPassword(password, userData.password);
      if (!isPwdValid) {
        return res.status(401).json({
          error: "Invalid email or password",
          code: 401,
        });
      }
    } else {
      const uid = wxId
        ? `wx_${wxId}`
        : googleId
        ? `google_${googleId}`
        : githubId
        ? `github_${githubId}`
        : null;

      if (!uid) {
        return res.status(400).json({
          error: "Missing platform identifier",
          code: 400,
        });
      }

      const doc = await userCollection.doc(uid).get();

      if (!doc.exists) {
        return res.status(404).json({
          error: "User not found",
          code: 404,
        });
      }

      userDoc = doc;
      userData = doc.data();
    }

    // custom token for wxMiniProject
    const customToken = await auth.createCustomToken(userDoc.id);

    const { shortToken, longToken } = await createToken();

    await userDoc.ref.update({
      token: shortToken,
      refreshToken: longToken,
      lastLogin: new Date(),
    });

    console.log("123")
 
    return res.status(200).json({
      uid: userDoc.id,
      email: userData.email,
      userName: userData.userName,
      token: shortToken,
      refreshToken: longToken,
      role: userData.role || UserRole.VISITOR,
      customToken,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      error: "Login failed",
      code: 500,
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { uid, token, refreshToken } = req.body;

    if (!uid || !token || !refreshToken)
      return res.status(401).json({
        error: "Missing properties to fresh token.",
        code: 401,
      });

    const userDoc = await userCollection.doc(uid).get();

    if (!userDoc.exists)
      return res.status(401).json({
        error: "User not found.",
        code: 401,
      });

    const userData = userDoc.data();

    if (userData.refreshToken != refreshToken)
      return res.status(403).json({
        error: "Invalid refresh token.",
        code: 403,
      });

    const { shortToken, longToken } = await createToken();

    await userDoc.ref.update({
      token: shortToken,
      refreshToken: longToken,
      lastLogin: new Date(),
    });

    res.status(200).json({
      token: shortToken,
      refreshToken: longToken,
      uid,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal Error",
      code: 500,
      details: {},
    });
  }
};
