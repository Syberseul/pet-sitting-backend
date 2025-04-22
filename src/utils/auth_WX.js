require("dotenv").config();
const { default: axios } = require("axios");

module.exports.getWxOpenId = async (code) => {
  const response = await axios.get(
    "https://api.weixin.qq.com/sns/jscode2session",
    {
      params: {
        appid: process.env.WX_APP_ID,
        secret: process.env.WX_SECRET_ID,
        js_code: code,
        grant_type: "authorization_code",
      },
    }
  );

  return response.data.openid;
};
