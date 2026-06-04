const service = require("../services/documents.service");
const crypto = require("crypto");

exports.createDocument = async (req, res, next) => {
  try {
    const { name, data } = req.body;

    const doc = await service.create({
      id: crypto.randomUUID(),
      name,
      data,
    });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const docs = await service.list();
    res.json(docs);
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await service.getById(req.params.id);
    if (!doc) return res.status(404).json({ error: "document not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    const { name, data } = req.body;
    const doc = await service.update(req.params.id, { name, data });
    if (!doc) return res.status(404).json({ error: "document not found" });
    res.json(doc);
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const deleted = await service.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: "document not found" });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
