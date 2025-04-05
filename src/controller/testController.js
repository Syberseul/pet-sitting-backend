const supabase = require("../DB");

exports.test = async (req, res) => {
  try {
    const { data, error } = await supabase.from("test_table").select("*");
    if (error) throw error;
    await res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
