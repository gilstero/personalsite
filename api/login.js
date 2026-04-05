const { createSessionToken, sessionCookie } = require("./_auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const { password } = req.body || {};
  const expectedPassword = process.env.BLOG_ADMIN_PASSWORD;

  if (!expectedPassword) {
    res.status(500).json({ error: "BLOG_ADMIN_PASSWORD is not set." });
    return;
  }

  if (password !== expectedPassword) {
    res.status(401).json({ error: "Incorrect password." });
    return;
  }

  res.setHeader("Set-Cookie", sessionCookie(createSessionToken()));
  res.status(200).json({ ok: true });
};
