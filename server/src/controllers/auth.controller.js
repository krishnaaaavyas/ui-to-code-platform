const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const service = require("../services/auth.service");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "super-secret-access";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "super-secret-refresh";
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || "7d";

// Cookie options helper
const getCookieOptions = () => ({
  httpOnly: true,
  secure: false, // set to true in production over HTTPS
  sameSite: "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });
};

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const existingUser = await service.getByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await service.create({ email, passwordHash });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

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
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await service.getByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    const cleanedUser = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };

    const accessToken = generateAccessToken(cleanedUser);
    const refreshToken = generateRefreshToken(cleanedUser);

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

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({ error: "invalid or expired refresh token" });
    }

    const user = await service.getById(payload.id);
    if (!user) {
      res.clearCookie("refreshToken", { path: "/api/auth" });
      return res.status(401).json({ error: "user not found" });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

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
