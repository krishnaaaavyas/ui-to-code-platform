require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./realtime/socket");
const { cleanupOrphanedUploads } = require("./controllers/uploads.controller");

const port = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.IO server
initSocket(server);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Clean up orphaned uploads on startup and schedule every hour
  cleanupOrphanedUploads().catch((err) => {
    console.error("Failed to run orphaned upload cleanup on startup:", err);
  });
  
  setInterval(() => {
    cleanupOrphanedUploads().catch((err) => {
      console.error("Failed to run orphaned upload cleanup on interval:", err);
    });
  }, 60 * 60 * 1000);
});
