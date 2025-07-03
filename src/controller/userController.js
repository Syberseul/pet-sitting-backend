const { db, auth } = require("../Server");
const {
  dbCollectionName,
  dbCollectionDocName,
} = require("../Server/enums/dbEnum");

const { Platform, UserRole } = require("../enum");

const { DefaultUserInfo } = require("../model/UserModel");
const { getWxOpenId } = require("../utils/auth_WX");

const { createToken } = require("../utils/jwt");

const { hashPwd, verifyPassword } = require("../utils/pwdUtils");

const userCollection = db.collection(dbCollectionName.USER);
const allDataList = db.collection(dbCollectionName.ALL_DATA_LIST);
const allUserDocRef = allDataList.doc(dbCollectionDocName.ALL_USERS);

const dogOwnerCollection = db.collection(dbCollectionName.DOG_OWNER);
const allOwnersRef = allDataList.doc(dbCollectionDocName.ALL_DOG_OWNERS);

const admin = require("firebase-admin");
const { interError } = require("../utils/utilFunctions");

exports.register = async (req, res) => {
  try {
    const isWxPlatform = req.headers.platform == Platform.WX;

    const {
      email,
      password,
      userName,
      wxId,
      googleId,
      githubId,
      dogOwnerRefNo,
    } = req.body;

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

    const firebaseCustomToken = await auth.createCustomToken(userRecord.uid);

    const { longToken } = await createToken();

    const userRef = userCollection.doc(userRecord.uid);

    // NO NEED to save firebaseCustomToken into db, as it requires frontend to call firebase.auth().signInWithCustomToken(firebaseCustomToken) to get actual token
    let userData = {
      ...DefaultUserInfo,
      id: userRecord.uid,
      email: email || "",
      userName: userName || "",
      wxId: wxId || "",
      googleId: googleId || "",
      githubId: githubId || "",
      isFromWx: isWxPlatform,
      // token: firebaseCustomToken,
      refreshToken: longToken,
      lastLogin: new Date().getTime(),
    };

    const batch = db.batch();

    if (dogOwnerRefNo) {
      userData = await linkDogOwnerToUser(batch, dogOwnerRefNo, userData);
      if (userData.error)
        return res.status(500).json({
          error: userData.error,
          code: 500,
        });
    }

    // use Custom Claims to save USER ROLE to firebase
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: UserRole.VISITOR,
    });

    if (isEmailAuth) userData.password = hashPwd(password);

    batch.set(userRef, userData);

    await batch.commit();

    const data = {
      uid: userRecord.uid,
      email: userRecord.email,
      userName,
      token: firebaseCustomToken,
      refreshToken: longToken,
    };

    if (dogOwnerRefNo) data.dogOwnerRefNo = dogOwnerRefNo;

    data.role = dogOwnerRefNo ? UserRole.DOG_OWNER : UserRole.VISITOR;

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Internal Error",
      code: 500,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, wxId, googleId, githubId, fcmToken } = req.body;
    const isWxPlatform = req.headers.platform === Platform.WX;

    const isEmailLogin = !wxId && !googleId && !githubId;

    let userDoc,
      userData,
      fcmTokens = [];

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
        if (isWxPlatform && wxId) {
          const openId = await getWxOpenId(wxId);
          console.log(openId);
        }

        return res.status(404).json({
          error: "User not found",
          code: 404,
        });
      }

      userDoc = doc;
      userData = doc.data();
    }

    if (fcmToken) {
      fcmTokens = userData.fcmTokens || [];

      if (!fcmTokens.includes(fcmToken)) fcmTokens.push(fcmToken);
    }

    const firebaseCustomToken = await auth.createCustomToken(userDoc.id);

    const tokenUserData = userData;
    delete tokenUserData.token;
    delete tokenUserData.refreshToken;

    const { longToken } = await createToken(tokenUserData);

    // NO NEED to update firebaseCustomToken
    await userDoc.ref.update({
      // token: firebaseCustomToken,
      refreshToken: longToken,
      lastLogin: new Date(),
      fcmTokens: fcmTokens,
    });

    const role = userData.role || UserRole.VISITOR;

    await admin.auth().setCustomUserClaims(userDoc.id, { role });

    const data = {
      uid: userDoc.id,
      email: userData.email,
      userName: userData.userName,
      token: firebaseCustomToken,
      refreshToken: longToken,
      role,
      receiveNotifications:
        userData.receiveNotifications ??
        [UserRole.ADMIN, UserRole.DEVELOPER].includes(role),
    };

    if (userData.dogOwnerRefNo) data.dogOwnerRefNo = userData.dogOwnerRefNo;

    return res.status(200).json(data);
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      error: "Login failed",
      code: 500,
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { fcmToken, userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "Missing user ID",
        code: 400,
      });
    }

    const userDoc = await userCollection.doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({
        error: "User not found",
        code: 404,
      });
    }

    if (fcmToken) {
      const currentTokens = userDoc.data().fcmTokens || [];
      const updatedTokens = currentTokens.filter((token) => token !== fcmToken);

      await userDoc.ref.update({
        fcmTokens: updatedTokens,
        token: null,
        refreshToken: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      code: 500,
    });
  }
};

exports.updateUserInfo = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { email, password, userName, dogOwnerRefNo } = req.body;

    if (!userId)
      return res.status(400).json({
        error: "Missing UserID",
        code: 400,
      });

    if (!email)
      return res.status(400).json({
        error: "Missing Email",
        code: 400,
      });

    const userRef = userCollection.doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists)
      return res.status(404).json({
        error: "User Not Found",
        code: 404,
      });

    // update Firebase Auth if password changes
    if (password) await auth.updateUser(userId, { email });

    let userData = userDoc.data();

    if (userName) userData.userName = userName;

    const batch = db.batch();

    if (dogOwnerRefNo) {
      userData = await linkDogOwnerToUser(batch, dogOwnerRefNo, userData);

      if (userData.error)
        return res.status(500).json({
          error: userData.error,
          code: 500,
        });

      await admin.auth().setCustomUserClaims(userId, {
        role: userData.role,
      });
    }

    const firebaseCustomToken = await auth.createCustomToken(userId);

    const { longToken } = await createToken();

    userData.refreshToken = longToken;
    userData.lastLogin = new Date().getTime();

    batch.update(userRef, userData);
    batch.update(allUserDocRef, { [userId]: userData });

    await batch.commit();

    const responseData = {
      uid: userId,
      email: userData.email,
      userName: userData.userName,
      token: firebaseCustomToken,
      refreshToken: longToken,
      role: userData.role,
      receiveNotifications:
        userData.receiveNotifications ??
        [UserRole.ADMIN, UserRole.DEVELOPER].includes(userData.role),
    };

    if (dogOwnerRefNo) responseData.dogOwnerRefNo = dogOwnerRefNo;

    return res.status(200).json(responseData);
  } catch (error) {
    return interError(res, error);
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { uid, token, refreshToken } = req.body;

    if (!uid || !token || !refreshToken) {
      return res.status(401).json({
        error: "Missing properties to fresh token.",
        code: 401,
      });
    }

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

    const firebaseCustomToken = await auth.createCustomToken(userDoc.id);

    const { longToken } = await createToken();

    await userDoc.ref.update({
      uid,
      refreshToken: longToken,
      lastLogin: new Date(),
    });

    res.status(200).json({
      token: firebaseCustomToken,
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

exports.mapUsers = async (req, res) => {
  try {
    const userSnapshot = await userCollection.get();

    if (userSnapshot.empty)
      return res.status(404).json({
        error: "No users found",
        code: 404,
      });

    const allUsersData = {};
    userSnapshot.forEach((user) => {
      const userData = user.data();
      allUsersData[user.id] = userData;
    });

    await allUserDocRef.set(allUsersData, { merge: true });

    return res.status(200).json({
      message: "All users synced to List/allUser successfully",
      count: userSnapshot.size,
    });
  } catch (err) {
    return interError(res, err);
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const userRole = req.user?.role || UserRole.VISITOR;
    const userId = req.user?.uid || "";

    if (userRole == UserRole.VISITOR || !userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const allUsers = await allDataList.doc(dbCollectionDocName.ALL_USERS).get();

    if (!allUsers.exists)
      return res.status(404).json({
        error: "No collection table found",
        code: 404,
      });

    const allUsersData = allUsers.data();

    const usersArray = Object.values(allUsersData).map((user) => {
      const userData = user;
      userData.validFcmTokens = user?.fcmTokens.length ?? 0;
      delete userData.fcmTokens;
      delete userData.token;
      delete userData.refreshToken;
      delete userData.password;
      return userData;
    });

    return res.status(200).json(usersArray);
  } catch (error) {
    return interError(res, error);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id: userId, role, dogOwnerRefNo } = req.params;

    if (!userId)
      return res.status(400).json({
        error: "Missing userId",
        code: 400,
      });

    const userDoc = await userCollection.doc(userId).get();

    if (!userDoc.exists)
      return res.status(400).json({
        error: "Missing user data",
        code: 400,
      });

    await userDoc.ref.update({
      role: Number(role),
    });

    const newUserData = { ...userDoc.data(), role: Number(role) };

    if (role === UserRole.DOG_OWNER && dogOwnerRefNo) {
    } else if (role !== UserRole.DOG_OWNER) {
    }

    const allUserRef = allDataList.doc(dbCollectionDocName.ALL_USERS);
    await allUserRef.update({
      [userId]: { ...newUserData },
    });

    delete newUserData.token;
    delete newUserData.refreshToken;
    delete newUserData.password;

    return res.status(200).json({
      data: newUserData,
      code: 200,
    });
  } catch (error) {
    return interError(res, error);
  }
};

exports.toggleUserReceiveNotification = async (req, res) => {
  try {
    const { id: userId, receiveNotification } = req.params;

    if (!userId)
      return res.status(400).json({
        error: "Missing userId",
        code: 400,
      });

    const userDoc = await userCollection.doc(userId).get();

    if (!userDoc.exists)
      return res.status(400).json({
        error: "Missing user data",
        code: 400,
      });

    const newReceiveProp = isNaN(receiveNotification)
      ? false
      : [UserRole.ADMIN, UserRole.DEVELOPER].includes(userDoc.data().role)
      ? Number(receiveNotification) == 1
      : false;

    await userDoc.ref.update({
      receiveNotifications: newReceiveProp,
    });

    const newUserData = {
      ...userDoc.data(),
      receiveNotifications: newReceiveProp,
    };

    const allUserRef = allDataList.doc(dbCollectionDocName.ALL_USERS);
    await allUserRef.update({
      [userId]: { ...newUserData },
    });

    delete newUserData.token;
    delete newUserData.refreshToken;
    delete newUserData.password;

    return res.status(200).json({
      data: newUserData,
      code: 200,
    });
  } catch (error) {
    return interError(res, error);
  }
};

const linkDogOwnerToUser = async (batch, dogOwnerRefNo, userData) => {
  const ownerRef = dogOwnerCollection.doc(dogOwnerRefNo);
  const ownerDoc = await ownerRef.get();

  if (!ownerDoc.exists) throw new Error("Invalid dogOwnerRefNo");

  const ownerData = ownerDoc.data();

  if (ownerData.linkedDogOwner)
    return { ...userData, error: "Dog owner already linked to another user" };

  batch.update(ownerRef, { linkedDogOwner: true });
  batch.update(allOwnersRef, {
    [dogOwnerRefNo]: { ...ownerData, linkedDogOwner: true },
  });

  return {
    ...userData,
    dogOwnerRefNo,
    role: UserRole.DOG_OWNER,
  };
};
