const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { createWorkspace,
    getWorkspaceOnUserId,
    getWorkspaceOnId,
    editWorkspace,
    deleteFile,
    deleteWorkspaces,
    workspaceCount,
 } = require('../Controllers/workspaceController');

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, '../public/uploads/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Use the correct folder path
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique file names
  },
});

// Create the upload middleware using multer
const upload = multer({ storage });

router.post('/createWorkspace', upload.array('files', 5), createWorkspace);
router.get('/getWorkspaceOnUserId/:id', getWorkspaceOnUserId);
router.get('/getWorkspaceOnId/:id', getWorkspaceOnId);
router.post('/editWorkspace/:id',upload.array('files'), editWorkspace);
router.post('/removeWorkspaceDocument', deleteFile);
router.post('/deleteWorkspace', deleteWorkspaces);
router.get('/workspaceCount/:org_id', workspaceCount);

module.exports = router;
