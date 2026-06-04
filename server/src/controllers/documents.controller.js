const service = require("../services/documents.service");
const crypto = require("crypto");

exports.createDocument = async (req, res, next) => {
  try {
    const { name, data } = req.body;

    const doc = await service.create({
      id: crypto.randomUUID(),
      name,
      data,
      user_id: req.user.id,
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const docs = await service.list(req.user.id);
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await service.getById(req.params.id, req.user.id);
    if (!doc) return res.status(404).json({ error: "document not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { name, data, version, manual } = req.body;

    const result = await service.update(req.params.id, req.user.id, {
      name,
      data,
      version,
      manual: !!manual,
    });

    if (!result) {
      return res.status(404).json({ error: "document not found" });
    }

    if (result.conflict) {
      return res.status(409).json({
        error: "Version conflict: This design has been updated elsewhere. Please reload or duplicate.",
        currentVersion: result.currentVersion,
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const deleted = await service.remove(req.params.id, req.user.id);
    if (!deleted) return res.status(404).json({ error: "document not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

exports.listVersions = async (req, res, next) => {
  try {
    const versions = await service.listVersions(req.params.id, req.user.id);
    if (!versions) return res.status(404).json({ error: "document not found" });
    res.json(versions);
  } catch (err) {
    next(err);
  }
};

exports.getVersion = async (req, res, next) => {
  try {
    const version = await service.getVersionById(req.params.id, req.params.versionId, req.user.id);
    if (!version) return res.status(404).json({ error: "version not found" });
    res.json(version);
  } catch (err) {
    next(err);
  }
};

exports.restoreVersion = async (req, res, next) => {
  try {
    const doc = await service.restore(req.params.id, req.params.versionId, req.user.id);
    if (!doc) return res.status(404).json({ error: "document or version not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};
