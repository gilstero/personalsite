const { isAuthenticated } = require("./_auth");

module.exports = async (req, res) => {
  if (!process.env.BLOG_SESSION_SECRET) {
    res.status(500).json({ error: "BLOG_SESSION_SECRET is not set." });
    return;
  }

  res.status(200).json({
    authenticated: isAuthenticated(req)
  });
};
