module.exports = (err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
};
