import jwt from "jsonwebtoken";

// No fallback default — server refuses to start in production without
// JWT_SECRET (see index.js). In dev, use a clearly-marked ephemeral value so
// missing config is obvious in logs and never mistaken for a real secret.
const SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("JWT_SECRET is required in production"); })()
    : "dev-only-insecure-secret-do-not-use-in-prod");

const JWT_ALGS = ["HS256"];

export function signToken(payload, opts = {}) {
  // 30-minute expiry — matches frontend inactivity timeout.
  return jwt.sign(payload, SECRET, { expiresIn: "30m", algorithm: "HS256", ...opts });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    // Explicit algorithm allowlist prevents alg-confusion attacks (e.g. a
    // token claiming alg:none or HS/RS swap tricks).
    const claims = jwt.verify(header.slice(7), SECRET, { algorithms: JWT_ALGS });
    req.user = claims;
    // Part 28/5a — sliding (rolling) expiration: every authenticated request
    // mints a fresh 30-minute token, so only real inactivity expires a session.
    const { iat, exp, nbf, ...payload } = claims;
    res.setHeader("X-Refresh-Token", signToken(payload));
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
