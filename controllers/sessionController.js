const crypto = require("crypto");
const Session = require("../models/session");
const logAction = require("../middleware/logAction");

/**
 * Generate a secure session token (used inside QR)
 */
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Teacher creates a session
 */
exports.createSession = async (req, res) => {
  try {
    const { courseId, latitude, longitude, radius, duration } = req.body;
    const teacherId = req.user.id; // from JWT middleware

    const sessionToken = generateSessionToken();
    const now = Date.now();
    const expires = new Date(now + 30 * 1000); // 30 sec expiry

    const session = await Session.create({
      courseId,
      teacherId,
      duration,
      location: {
        latitude,
        longitude,
        radius,
      },
      qrCode: {
        sessionToken,
        generatedAt: now,
        expiresAt: expires,
        isValid: true,
      },
    });

    await logAction({
      userId: teacherId,
      action: "session_created",
      entityType: "session",
      entityId: session._id,
      details: { courseId },
      ip: req.ip,
    });

    return res.status(201).json({
      message: "Session created successfully",
      sessionId: session._id,
      qrToken: session.qrCode.sessionToken,
      expiresAt: session.qrCode.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create session", error: err.message });
  }
};

/**
 * Get QR information for a session
 */
exports.getQR = async (req, res) => {
  try {
    const sessionId = req.params.id;

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    return res.status(200).json({
      qrToken: session.qrCode.sessionToken,
      expiresAt: session.qrCode.expiresAt,
      isValid: session.qrCode.isValid,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch QR", error: err.message });
  }
};

/**
 * Refresh QR every 15–30 seconds
 */
exports.refreshQR = async (req, res) => {
  try {
    const sessionId = req.params.id;

    const newToken = generateSessionToken();
    const now = Date.now();
    const newExpiry = new Date(now + 30 * 1000);

    const updated = await Session.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          "qrCode.sessionToken": newToken,
          "qrCode.generatedAt": now,
          "qrCode.expiresAt": newExpiry,
          "qrCode.isValid": true,
        },
      },
      { new: true }
    );

    await logAction({
      userId: req.user.id,
      action: "qr_generated",
      entityType: "session",
      entityId: sessionId,
      details: { refreshed: true },
      ip: req.ip,
    });

    return res.status(200).json({
      message: "QR refreshed",
      qrToken: updated.qrCode.sessionToken,
      expiresAt: updated.qrCode.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ message: "QR refresh failed", error: err.message });
  }
};

/**
 * Invalidate QR after time expires or session ends
 */
exports.invalidateQR = async (sessionId) => {
  await Session.findByIdAndUpdate(sessionId, {
    $set: { "qrCode.isValid": false }
  });
};
