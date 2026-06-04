const express = require("express");
const cors = require("cors");
const documentsRoutes = require("./routes/documents.routes");
const errorHandler = require("./middleware/errorHandler");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/api/documents", documentsRoutes);

app.use(errorHandler);

module.exports = app;
