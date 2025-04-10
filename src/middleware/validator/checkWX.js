require("dotenv").config();

module.exports.wxVerify = (req, res, next) => {
  const isMiniProgramRequest =
    req.headers["user-agent"] &&
    req.headers["user-agent"].includes("miniProgram");

  if (isMiniProgramRequest) {
    const uuidFromHeader = req.headers["x-from-miniprogram"];

    // 如果没有 X-From-MiniProgram，返回 400 错误，表示小程序请求必须携带该字段
    if (!uuidFromHeader)
      return res.status(400).json({
        error:
          "X-From-MiniProgram header is required for mini program requests",
      });

    // 3. 检查 UUID 是否和后端的 UUID 相匹配
    if (uuidFromHeader !== process.env.WX_UUID) {
      // 如果 UUID 不匹配，则返回 403 错误
      return res.status(403).json({ error: "Invalid UUID from Mini Program" });
    }
  }

  next();
};
