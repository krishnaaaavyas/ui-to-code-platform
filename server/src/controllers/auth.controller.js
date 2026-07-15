const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const service = require("../services/auth.service");

// Retrieve secrets and ensure they are present
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

// Secure Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const generateAccessToken = (user) => {
  if (!JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET not configured");
  return jwt.sign({ id: user.id, email: user.email }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

const generateRefreshToken = (user) => {
  if (!JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET not configured");
  return jwt.sign({ id: user.id, email: user.email, jti: crypto.randomUUID() }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
};

// Email & Password rules helpers
const normalizeEmail = (email) => {
  if (typeof email !== "string") return "";
  return email.trim().toLowerCase();
};

const validatePassword = (password) => {
  if (typeof password !== "string") return false;
  // Strong password rule: min 8 chars, at least 1 letter, at least 1 number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
};

// Dummy hash for constant-time comparisons when email does not exist
const DUMMY_HASH = bcrypt.hashSync("dummy_password_val_1", 10);

exports.register = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: "Password is too weak. It must be at least 8 characters long and contain both letters and numbers.",
      });
    }

    const existingUser = await service.getByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await service.create({ email, passwordHash });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await service.createRefreshToken(user.id, refreshToken, expiresAt);

    res.cookie("refreshToken", refreshToken, getCookieOptions());
    res.status(201).json({
      user,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await service.getByEmail(email);
    
    // Constant-time check mitigation for account enumeration
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    const cleanedUser = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };

    const accessToken = generateAccessToken(cleanedUser);
    const refreshToken = generateRefreshToken(cleanedUser);

    // Save refresh token to DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await service.createRefreshToken(user.id, refreshToken, expiresAt);

    res.cookie("refreshToken", refreshToken, getCookieOptions());
    res.json({
      user: cleanedUser,
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "refresh token is missing" });
    }

    // 1. Verify existence of refresh token in database
    const dbToken = await service.getRefreshToken(refreshToken);
    if (!dbToken) {
      // Replay attack / revoked token family cleanup!
      // Revoke all tokens for the user since this might be a compromised family.
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        await service.revokeAllUserRefreshTokens(decoded.id);
      } catch (err) {
        // Token was invalid anyway, just clean up cookie
      }
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({ error: "invalid or expired refresh token" });
    }

    // 2. Verify signature and validity of the refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      await service.revokeRefreshToken(refreshToken);
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({ error: "invalid or expired refresh token" });
    }

    const user = await service.getById(payload.id);
    if (!user) {
      await service.revokeRefreshToken(refreshToken);
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({ error: "user not found" });
    }

    // 3. Delete old refresh token (used once) and issue a rotated pair
    await service.revokeRefreshToken(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Save new refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await service.createRefreshToken(user.id, newRefreshToken, expiresAt);

    res.cookie("refreshToken", newRefreshToken, getCookieOptions());
    res.json({
      user,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await service.revokeRefreshToken(refreshToken);
    }
    res.clearCookie("refreshToken", { path: "/api/auth" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    next(error);
  }
};
