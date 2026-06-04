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
require("dotenv").config();

const app = express();

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
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/public/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use(errorHandler);

module.exports = app;

