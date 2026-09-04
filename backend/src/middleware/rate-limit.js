import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// Shared IP-key resolver — respects the first X-Forwarded-For hop when the API
// sits behind Nginx (see deploy/nginx.conf.example), then normalizes IPv6
// addresses via express-rate-limit's helper so low-bit variations cannot evade
// the rate limit.
function ipKey(req) {
  const xf = req.headers["x-forwarded-for"];
  const raw =
    typeof xf === "string" && xf.length > 0
      ? xf.split(",")[0].trim()
      : (req.ip || "unknown");
  return ipKeyGenerator(raw);
}

// Strict brute-force guard for POST /api/auth/login.
// 10 attempts per IP per 15 minutes — enough for a legitimate user with a
// forgotten password, small enough to make online guessing infeasible.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: "محاولات كثيرة، يرجى المحاولة بعد قليل." },
});

// Public write endpoints (registration form, etc.) — 5 per minute per IP.
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً." },
});

// Defense-in-depth: cap the total request rate any single IP can throw at the
// API surface. 300/min is generous for a real logged-in admin browsing several
// pages, but caps abuse of any future endpoint that forgets its own limiter.
export const apiGeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  message: { error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً." },
});