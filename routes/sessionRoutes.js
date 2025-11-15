const express = require("express");
const router = express.Router();
const {
  createSession,
  getQR,
  refreshQR
} = require("../controllers/sessionController");

const verifyJWT = require("../middleware/verifyJWT"); // you'll create soon

// Teacher creates a session
router.post("/create", verifyJWT, createSession);

// Get QR details for mobile app
router.get("/:id/qr", verifyJWT, getQR);

// Refresh QR every 15–30 seconds
router.post("/:id/refresh", verifyJWT, refreshQR);

module.exports = router;
