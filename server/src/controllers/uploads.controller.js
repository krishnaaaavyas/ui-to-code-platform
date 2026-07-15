const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const documentsService = require("../services/documents.service");
const assetsService = require("../services/assets.service");

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];
const ALLOWED_MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

// Helper to verify magic numbers of images
function checkMagicNumbers(buffer) {
  if (buffer.length >= 4) {
    const hex = buffer.slice(0, 4).toString("hex").toUpperCase();
    if (hex === "89504E47") return "image/png";
    if (hex.startsWith("FFD8FF")) return "image/jpeg";
    if (hex === "47494638") return "image/gif";
    if (hex === "52494646") {
      const sub = buffer.slice(8, 12).toString("utf8");
      if (sub === "WEBP") return "image/webp";
    }
  }
  const str = buffer.slice(0, 100).toString("utf8").trim().toLowerCase();
  if (str.startsWith("<?xml") || str.startsWith("<svg") || str.includes("<svg")) {
    return "image/svg+xml";
  }
  return null;
}

exports.getPresignedUrl = async (req, res, next) => {
  try {
    const { filename, mimeType, documentId } = req.body;

    if (!filename || !mimeType || !documentId) {
      return res.status(400).json({ error: "filename, mimeType, and documentId are required." });
    }

    // Verify user has editor/owner access to the document
    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }
    if (doc.user_role === "viewer") {
      return res.status(403).json({ error: "Access denied: Viewers cannot upload assets." });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: "Only image uploads are allowed (.png, .jpg, .jpeg, .gif, .webp, .svg)." });
    }

    const uuid = crypto.randomUUID();
    const key = `uploads/${documentId}/${uuid}${ext}`;

    const baseUrl = process.env.API_BASE_URL || "";

    // Generate expiring local upload token (valid for 15 minutes)
    if (!JWT_ACCESS_SECRET) {
      return res.status(500).json({ error: "Upload signature configuration missing on server" });
    }
    
    const uploadToken = jwt.sign(
      { userId: req.user.id, documentId, key },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const uploadUrl = `${baseUrl}/api/uploads/mock-upload?token=${encodeURIComponent(uploadToken)}`;
    const assetUrl = `${baseUrl}/public/uploads/${key}`;

    return res.json({ uploadUrl, assetUrl, key });
  } catch (err) {
    next(err);
  }
};

exports.mockUpload = async (req, res, next) => {
  let writeStream = null;
  let targetPath = null;
  try {
    const uploadToken = req.query.token;
    if (!uploadToken) {
      return res.status(400).json({ error: "Query parameter 'token' is required." });
    }

    // 1. Verify expiring signed upload token
    let payload;
    try {
      payload = jwt.verify(uploadToken, JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Upload token is invalid or expired." });
    }

    const { userId, documentId, key } = payload;

    // 2. Re-confirm permissions
    const doc = await documentsService.getById(documentId, userId);
    if (!doc || doc.user_role === "viewer") {
      return res.status(403).json({ error: "Access denied: Unauthorized to upload to this document." });
    }

    // 3. Prevent path traversal
    const uploadsDir = path.resolve(__dirname, "../../public/uploads");
    targetPath = path.resolve(uploadsDir, key);
    if (!targetPath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: "Invalid upload key path traversal." });
    }

    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    writeStream = fs.createWriteStream(targetPath);
    
    let bytesWritten = 0;
    let headerBuffer = Buffer.alloc(0);
    let verifiedMime = false;
    let limitExceeded = false;
    let responseSent = false;

    req.on("data", (chunk) => {
      if (limitExceeded) return;

      bytesWritten += chunk.length;
      if (bytesWritten > MAX_UPLOAD_SIZE) {
        limitExceeded = true;
        writeStream.destroy();
        req.destroy();
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        if (!responseSent) {
          responseSent = true;
          res.status(400).json({ error: "File exceeds maximum size limit of 5MB." });
        }
        return;
      }

      // Collect enough bytes to check magic numbers
      if (!verifiedMime) {
        headerBuffer = Buffer.concat([headerBuffer, chunk]);
        if (headerBuffer.length >= 100) {
          const detectedMime = checkMagicNumbers(headerBuffer);
          if (!detectedMime || !ALLOWED_MIMES.includes(detectedMime)) {
            limitExceeded = true;
            writeStream.destroy();
            req.destroy();
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
            }
            if (!responseSent) {
              responseSent = true;
              res.status(400).json({ error: "Invalid file signature. Only image files are allowed." });
            }
            return;
          }
          verifiedMime = true;
        }
      }

      writeStream.write(chunk);
    });

    req.on("end", () => {
      if (limitExceeded) return;

      // Final check if file was smaller than 100 bytes
      if (!verifiedMime) {
        const detectedMime = checkMagicNumbers(headerBuffer);
        if (!detectedMime || !ALLOWED_MIMES.includes(detectedMime)) {
          writeStream.destroy();
          if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
          }
          if (!responseSent) {
            responseSent = true;
            res.status(400).json({ error: "Invalid file signature. Only image files are allowed." });
          }
          return;
        }
      }

      writeStream.end(() => {
        if (!responseSent) {
          res.status(200).json({ ok: true });
        }
      });
    });

    writeStream.on("error", (err) => {
      console.error("Local upload write stream error:", err);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ error: "Failed to save file." });
      }
    });

  } catch (err) {
    if (writeStream) writeStream.destroy();
    if (targetPath && fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    next(err);
  }
};

exports.registerAsset = async (req, res, next) => {
  try {
    const { documentId, key, url, mimeType, sizeBytes } = req.body;

    if (!documentId || !key || !url) {
      return res.status(400).json({ error: "documentId, key, and url are required." });
    }

    // Verify caller has editor/owner access
    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }
    if (doc.user_role === "viewer") {
      return res.status(403).json({ error: "Access denied: Viewers cannot register assets." });
    }

    const asset = await assetsService.create({
      documentId,
      userId: req.user.id,
      key,
      url,
      mimeType,
      sizeBytes,
    });

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
};

exports.listAssets = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;

    // Verify caller has access
    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const list = await assetsService.list(documentId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

// Orphaned uploads cleanup routine
exports.cleanupOrphanedUploads = async () => {
  try {
    const uploadsDir = path.resolve(__dirname, "../../public/uploads");
    if (!fs.existsSync(uploadsDir)) return;

    // Get all files on disk under public/uploads/uploads recursively
    const getFiles = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(getFiles(fullPath));
        } else {
          results.push({ fullPath, ctime: stat.ctime });
        }
      });
      return results;
    };

    const files = getFiles(uploadsDir);
    const poolDb = require("../db/client");
    
    // Fetch all active asset keys from database
    const dbAssetsRes = await poolDb.query("select key from assets");
    const activeKeys = new Set(dbAssetsRes.rows.map((row) => row.key));

    const now = Date.now();
    let deleteCount = 0;

    for (const file of files) {
      // Relative key matches "uploads/doc-id/uuid.ext"
      const relativeKey = path.relative(uploadsDir, file.fullPath).replace(/\\/g, "/");
      
      // If file is older than 1 hour and not in DB assets table, clean it up!
      if (!activeKeys.has(relativeKey) && (now - file.ctime.getTime() > 60 * 60 * 1000)) {
        try {
          fs.unlinkSync(file.fullPath);
          deleteCount++;
        } catch (e) {
          console.error(`Failed to delete orphaned file: ${file.fullPath}`, e);
        }
      }
    }
    if (deleteCount > 0) {
      console.log(`[Upload Cleanup] Deleted ${deleteCount} orphaned upload file(s).`);
    }
  } catch (err) {
    console.error("Error during orphaned uploads cleanup:", err);
  }
};
