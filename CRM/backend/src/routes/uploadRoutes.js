const express = require('express');
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const { ok } = require('../utils/apiResponse');

const router = express.Router();
router.use(protect);

// POST /api/uploads  (single file — image, pdf, or video), field name: "file"
router.post('/', upload.single('file'), (req, res) => {
  ok(res, { url: req.file.path, publicId: req.file.filename }, 'File uploaded successfully', 201);
});

module.exports = router;
