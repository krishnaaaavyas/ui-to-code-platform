const jwt = require("jsonwebtoken");
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "super-secret-access";

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "authorization token is required" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "authorization token format must be Bearer <token>" });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "invalid or expired access token" });
  }
};
// 
