const crypto = require("crypto");

const SESSION_COOKIE = "blog_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  return process.env.BLOG_SESSION_SECRET || process.env.BLOG_ADMIN_PASSWORD || "dev-secret";
}

function sign(value) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("hex");
}

function createSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      exp: Date.now() + SESSION_TTL_SECONDS * 1000
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, entry) => {
    const [rawKey, ...rawValue] = entry.trim().split("=");

    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = rawValue.join("=");
    return cookies;
  }, {});
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE];

  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded.exp > Date.now();
  } catch (error) {
    return false;
  }
}

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${SESSION_TTL_SECONDS}`;
}

module.exports = {
  SESSION_COOKIE,
  createSessionToken,
  isAuthenticated,
  sessionCookie
};
