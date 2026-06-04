const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const documentsService = require("../services/documents.service");
const assetsService = require("../services/assets.service");

// S3 credentials config check
const hasS3Config = () => {
  return (
    process.env.AWS_ACCESS_KEY_ID !== undefined &&
    process.env.AWS_SECRET_ACCESS_KEY !== undefined &&
    process.env.S3_BUCKET !== undefined
  );
};

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

    const uuid = crypto.randomUUID();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${documentId}/${uuid}-${sanitizedFilename}`;

    if (hasS3Config()) {
      const s3 = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const uploadUrl = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
          ContentType: mimeType,
        }),
        { expiresIn: 3600 }
      );

      const assetUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

      return res.json({ uploadUrl, assetUrl, key });
    } else {
      // Local mock upload mode fallback
      const uploadUrl = `http://localhost:4000/api/uploads/mock-upload?key=${encodeURIComponent(key)}`;
      const assetUrl = `http://localhost:4000/public/uploads/${key}`;

      return res.json({ uploadUrl, assetUrl, key });
    }
  } catch (err) {
    next(err);
  }
};

exports.mockUpload = async (req, res, next) => {
  try {
    const fileKey = req.query.key;
    if (!fileKey) {
      return res.status(400).json({ error: "Query parameter 'key' is required." });
    }

    // Protect key path traversal attacks
    if (fileKey.includes("..")) {
      return res.status(400).json({ error: "Invalid file key." });
    }

    const targetPath = path.join(__dirname, "../../public/uploads", fileKey);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const writeStream = fs.createWriteStream(targetPath);
    req.pipe(writeStream);

    req.on("end", () => {
      res.status(200).json({ ok: true });
    });

    writeStream.on("error", (err) => {
      console.error("Mock upload write error:", err);
      res.status(500).json({ error: "Failed to write local asset file." });
    });
  } catch (err) {
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
