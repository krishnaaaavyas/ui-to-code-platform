const permissionsService = require("../services/permissions.service");
const documentsService = require("../services/documents.service");
const authService = require("../services/auth.service");
const { revokeSocketAccess } = require("../realtime/socket");

exports.shareDocument = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    if (!["viewer", "editor"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'viewer' or 'editor'." });
    }

    // 1. Fetch document and verify ownership
    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Direct user_id check to ensure ONLY the owner can share
    if (doc.user_id !== req.user.id) {
      return res.status(403).json({ error: "Only the document owner can share it." });
    }

    // 2. Find target user by email
    const targetUser = await authService.getByEmail(email);
    if (!targetUser) {
      return res.status(404).json({ error: "User with this email does not exist." });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: "You cannot share a document with yourself." });
    }

    // 3. Create or update permission
    const permission = await permissionsService.create({
      documentId,
      userId: targetUser.id,
      role,
    });

    // Revoke current socket access so they reconnect with their updated/downgraded role
    revokeSocketAccess(targetUser.id, documentId);

    res.status(201).json({
      id: permission.id,
      document_id: permission.document_id,
      user_id: permission.user_id,
      role: permission.role,
      email: targetUser.email,
    });
  } catch (err) {
    next(err);
  }
};

exports.listPermissions = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;

    // Verify caller has access to this document
    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    const list = await permissionsService.list(documentId);
    res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.removePermission = async (req, res, next) => {
  try {
    const { id: documentId, permissionId } = req.params;

    const doc = await documentsService.getById(documentId, req.user.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found." });
    }

    // Only owner of document or the user who holds the permission can delete it
    const permissions = await permissionsService.list(documentId);
    const targetPerm = permissions.find((p) => p.id === permissionId);
    if (!targetPerm) {
      return res.status(404).json({ error: "Permission not found." });
    }

    const isOwner = doc.user_id === req.user.id;
    const isSelf = targetPerm.user_id === req.user.id;

    if (!isOwner && !isSelf) {
      return res.status(403).json({ error: "Unauthorized to remove this permission." });
    }

    await permissionsService.remove(permissionId);

    // Evict user immediately from room
    revokeSocketAccess(targetPerm.user_id, documentId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
