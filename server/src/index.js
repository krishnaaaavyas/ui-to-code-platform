require("dotenv").config();
const http = require("http");
const app = require("./app");
const { initSocket } = require("./realtime/socket");

const port = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialize Socket.IO server
initSocket(server);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
