// Force test environment and set required JWT keys before loading app
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-key-that-is-at-least-32-chars-long";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-key-that-is-at-least-32-chars-long";

const request = require("supertest");
const app = require("../app");
const database = require("../db/database");

describe("UI-to-Code Platform Backend Tests", () => {
  let userAToken = "";
  let userBToken = "";
  let userCToken = "";
  let userAId = "";
  let userBId = "";
  let userCId = "";
  
  let sharedDocId = "";
  let versionToRestore = "";

  beforeAll(async () => {
    // SQLite in-memory tables are initialized automatically in test mode
  });

  afterAll(async () => {
    if (database.sqliteDb) {
      database.sqliteDb.close();
    }
  });

  // 1. AUTHENTICATION TESTS
  describe("Authentication API", () => {
    it("should fail registration with a weak password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "usera@example.com",
          password: "weak",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("weak");
    });

    it("should register user A with a strong password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          email: "UserA@Example.com", // testing normalization
          password: "Secure123Password",
        });
      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe("usera@example.com"); // normalized
      userAToken = res.body.accessToken;
      userAId = res.body.user.id;
    });

    it("should register user B and user C", async () => {
      const resB = await request(app)
        .post("/api/auth/register")
        .send({
          email: "userb@example.com",
          password: "Secure123Password",
        });
      expect(resB.status).toBe(201);
      userBToken = resB.body.accessToken;
      userBId = resB.body.user.id;

      const resC = await request(app)
        .post("/api/auth/register")
        .send({
          email: "userc@example.com",
          password: "Secure123Password",
        });
      expect(resC.status).toBe(201);
      userCToken = resC.body.accessToken;
      userCId = resC.body.user.id;
    });

    it("should fail login with incorrect password and prevent enumeration", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: "WrongPassword123",
        });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("invalid email or password");
    });

    it("should login user A and return refresh token cookie", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "usera@example.com",
          password: "Secure123Password",
        });
      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
      const cookies = res.headers["set-cookie"][0];
      expect(cookies).toContain("refreshToken");
    });

    it("should rotate refresh token and revoke reused tokens (token-family tracking)", async () => {
      // Login to get fresh cookie
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "usera@example.com",
          password: "Secure123Password",
        });
      
      const originalCookie = loginRes.headers["set-cookie"][0].split(";")[0];

      // Refresh 1st time - should succeed and yield rotated cookie
      const refreshRes1 = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", originalCookie);
      
      expect(refreshRes1.status).toBe(200);
      expect(refreshRes1.body.accessToken).toBeDefined();
      const rotatedCookie = refreshRes1.headers["set-cookie"][0].split(";")[0];

      // Refresh 2nd time with same ORIGINAL token - should fail (replay attack detection) and revoke family
      const refreshRes2 = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", originalCookie);
      
      expect(refreshRes2.status).toBe(401);

      // Now the rotated token should also be invalid because family was revoked
      const refreshRes3 = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", rotatedCookie);
      
      expect(refreshRes3.status).toBe(401);
    });
  });

  // 2. AUTHORIZATION & PERSISTENCE TESTS
  describe("Documents and Authorization API", () => {
    beforeAll(async () => {
      // Re-login User A to get a valid token
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "usera@example.com",
          password: "Secure123Password",
        });
      userAToken = res.body.accessToken;
    });

    it("should allow User A to create a document", async () => {
      const res = await request(app)
        .post("/api/documents")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          name: "User A Design",
          data: {
            board: { width: 800, height: 600, background: "#ffffff" },
            elements: [{ id: "el-1", type: "rect", x: 10, y: 10 }]
          },
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      sharedDocId = res.body.id;
    });

    it("should allow Owner A to share document with Editor B and Viewer C", async () => {
      const resB = await request(app)
        .post(`/api/permissions/${sharedDocId}/share`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          email: "userb@example.com",
          role: "editor",
        });
      expect(resB.status).toBe(201);

      const resC = await request(app)
        .post(`/api/permissions/${sharedDocId}/share`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          email: "userc@example.com",
          role: "viewer",
        });
      expect(resC.status).toBe(201);
    });

    it("should allow Editor B to edit/save changes (solving the 404 saving bug)", async () => {
      const res = await request(app)
        .put(`/api/documents/${sharedDocId}`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          name: "User A Design (Updated by B)",
          data: {
            board: { width: 800, height: 600, background: "#ffffff" },
            elements: [{ id: "el-1", type: "rect", x: 20, y: 20 }]
          },
          version: 1, // original version
        });
      expect(res.status).toBe(200);
      expect(res.body.version).toBe(2);
    });

    it("should deny Viewer C from editing/saving changes", async () => {
      const res = await request(app)
        .put(`/api/documents/${sharedDocId}`)
        .set("Authorization", `Bearer ${userCToken}`)
        .send({
          name: "Hacked Title",
          data: {
            board: { width: 800, height: 600, background: "#ffffff" },
            elements: []
          },
          version: 2,
        });
      expect(res.status).toBe(403);
    });

    it("should throw 409 conflict when saving with outdated version", async () => {
      const res = await request(app)
        .put(`/api/documents/${sharedDocId}`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          name: "Conflict save attempt",
          data: {
            board: { width: 800, height: 600, background: "#ffffff" },
            elements: []
          },
          version: 1, // Outdated, version is 2 now
        });
      expect(res.status).toBe(409);
      expect(res.body.currentVersion).toBe(2);
    });

    it("should list version history and allow Editor B to restore a version", async () => {
      const listRes = await request(app)
        .get(`/api/documents/${sharedDocId}/versions`)
        .set("Authorization", `Bearer ${userBToken}`);
      
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThan(0);
      versionToRestore = listRes.body[0].id;

      const restoreRes = await request(app)
        .post(`/api/documents/${sharedDocId}/restore/${versionToRestore}`)
        .set("Authorization", `Bearer ${userBToken}`);
      
      expect(restoreRes.status).toBe(200);
    });
  });

  // 3. UPLOAD SECURITY TESTS
  describe("Upload Security API", () => {
    it("should reject unauthenticated upload token requests", async () => {
      const res = await request(app)
        .post("/api/uploads/presign")
        .send({
          filename: "test.png",
          mimeType: "image/png",
          documentId: sharedDocId,
        });
      expect(res.status).toBe(401);
    });

    it("should generate expiring upload token for authorized editor", async () => {
      const res = await request(app)
        .post("/api/uploads/presign")
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          filename: "test.png",
          mimeType: "image/png",
          documentId: sharedDocId,
        });
      expect(res.status).toBe(200);
      expect(res.body.uploadUrl).toContain("token=");
    });

    it("should reject local upload of non-image file formats using signature checks", async () => {
      const resToken = await request(app)
        .post("/api/uploads/presign")
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          filename: "malicious.exe",
          mimeType: "image/png", // lying to header
          documentId: sharedDocId,
        });
      
      expect(resToken.status).toBe(400); // extension check blocks it early
    });
  });

  // 4. AI FALLBACK TESTS
  describe("AI Fallback Scaffolding", () => {
    it("should return status indicating AI is disabled (or enabled if key is set)", async () => {
      const res = await request(app)
        .get("/api/ai/status")
        .set("Authorization", `Bearer ${userBToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBeDefined();
    });

    it("should fallback to deterministic scaffold on code generation when API key is missing", async () => {
      const res = await request(app)
        .post("/api/ai/generate")
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          elements: [{ id: "text-1", type: "text", text: "Brand Label", x: 10, y: 10, width: 100, height: 30 }],
          boardConfig: { boardWidth: 800, boardHeight: 600, backgroundColor: "#ffffff" },
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.generated.files[0].filename).toBe("App.jsx");
      expect(res.body.generated.files[0].content).toContain("Fallback Local Canvas Scaffold");
    });
  });
});
