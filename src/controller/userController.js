const { createToken } = require("../utils/jwt");
const supabase = require("../DB");

const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { email, password, username, role = 11 } = req.body;

    // 1. 验证输入
    if (!email || !password) {
      return res.status(400).json({
        error: "缺少必填字段: email, password",
      });
    }

    // 2. 检查用户名是否已存在
    const { data: existingUser } = await supabase
      .from("Users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: "邮箱已存在" });
    }

    // 3. 调用Supabase Auth注册
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, role }, // 存储到auth.users的metadata
      },
    });

    if (authError) throw authError;

    const { shortToken, longToken } = await createToken({ email, password });

    // 4. 写入自定义表（Users）
    const { error: dbError } = await supabase.from("Users").insert({
      username,
      email,
      role,
      jwt_Short: shortToken,
      jwt_Long: longToken,
    });

    if (dbError) throw dbError;

    // 5. 返回响应
    res.status(201).json({
      message: "注册成功",
      user: {
        id: data.user.id,
        email,
        username,
        role,
        token: shortToken,
        refreshToken: longToken,
      },
    });
  } catch (err) {
    console.error("注册错误:", err);

    // 特定错误处理
    if (err.message.includes("User already registered")) {
      return res.status(409).json({ error: "该邮箱已注册" });
    }

    res.status(500).json({
      error: "注册失败",
      //   details: process.env.NODE_ENV === "development" ? err.message : null,
      details: err.message,
    });
  }
};
