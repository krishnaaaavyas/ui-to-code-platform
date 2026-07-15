require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const documentsRoutes = require("./routes/documents.routes");
const permissionsRoutes = require("./routes/permissions.routes");
const uploadsRoutes = require("./routes/uploads.routes");
const aiRoutes = require("./routes/ai.routes");
const errorHandler = require("./middleware/errorHandler");

// Reject production startup if secrets are missing or weak
if (process.env.NODE_ENV === "production") {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || accessSecret.length < 32 || accessSecret.toLowerCase().includes("secret") || accessSecret.includes("supersecret")) {
    console.error("CRITICAL ERROR: JWT_ACCESS_SECRET is missing, weak, or too short in production.");
    process.exit(1);
  }
  if (!refreshSecret || refreshSecret.length < 32 || refreshSecret.toLowerCase().includes("secret") || refreshSecret.includes("supersecret")) {
    console.error("CRITICAL ERROR: JWT_REFRESH_SECRET is missing, weak, or too short in production.");
    process.exit(1);
  }
}

const app = express();

// Proxy-aware IP detection trust
app.set("trust proxy", true);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan("dev"));

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" })); // Enforce size limit on JSON payloads too

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    aiEnabled: !!process.env.OPENAI_API_KEY,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/public/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use(errorHandler);

module.exports = app;
