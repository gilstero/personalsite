const crypto = require("crypto");

const SESSION_COOKIE = "blog_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.BLOG_SESSION_SECRET;
  if (!secret) {
    throw new Error("BLOG_SESSION_SECRET is not set.");
  }
  return secret;
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

  if (!payload || !signature || !/^[a-f0-9]{64}$/.test(signature)) {
    return false;
  }

  const expectedSignature = Buffer.from(sign(payload), "hex");
  const providedSignature = Buffer.from(signature, "hex");
  if (!crypto.timingSafeEqual(expectedSignature, providedSignature)) {
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
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_TTL_SECONDS}`;
}

module.exports = {
  SESSION_COOKIE,
  createSessionToken,
  isAuthenticated,
  sessionCookie
};
