const CryptoJS = require("crypto-js");

const hashPwd = (pwd) => {
  const salt = CryptoJS.lib.WordArray.random(16).toString();
  const hashed = CryptoJS.SHA256(pwd + salt).toString();
  return `${salt}&&${hashed}`;
};

const verifyPassword = (inputPassword, storedHash) => {
  const [salt, originalHash] = storedHash.split("&&");
  const inputHash = CryptoJS.SHA256(inputPassword + salt).toString();
  return inputHash === originalHash;
};

module.exports = { hashPwd, verifyPassword };
