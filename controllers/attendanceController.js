const Attendance = require("../models/attendance");
const Session = require("../models/session");
const User = require("../models/userModel");
const AuditLog = require("../models/auditLog");

/**
 * Haversine formula for distance (in meters)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in meters
};

/**
 * Mark attendance for student
 */
exports.markAttendance = async (req, res) => {
  try {
    const { sessionId, qrToken, latitude, longitude } = req.body;
    const studentId = req.user.id; // from JWT
    const deviceId = req.user.deviceId; // stored in JWT or user lookup

    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // 1. Validate Session Status
    if (session.status !== "active") {
      return res.status(400).json({ message: "Session is not active" });
    }

    // 2. Validate QR token
    if (
      session.qrCode.sessionToken !== qrToken ||
      session.qrCode.isValid === false
    ) {
      await logAudit(studentId, "attendance_marked", "attendance", sessionId, {
        outcome: "failure",
        errorMessage: "Invalid QR token",
      });
      return res.status(400).json({ message: "Invalid QR token" });
    }

    // 3. Check QR expiry
    if (new Date() > session.qrCode.expiresAt) {
      await logAudit(studentId, "attendance_marked", "attendance", sessionId, {
        outcome: "failure",
        errorMessage: "QR expired",
      });
      return res.status(400).json({ message: "QR expired" });
    }

    // 4. Validate registered device
    const user = await User.findById(studentId);
    if (!user || user.deviceId !== deviceId) {
      await logAudit(studentId, "attendance_marked", "attendance", sessionId, {
        outcome: "failure",
        errorMessage: "Device mismatch",
        deviceId,
      });
      return res.status(403).json({
        message: "Attendance not allowed: device not registered",
      });
    }

    // 5. Validate location radius
    const requiredLat = session.location.latitude;
    const requiredLon = session.location.longitude;
    const requiredRadius = session.location.radius;

    const distance = calculateDistance(
      latitude,
      longitude,
      requiredLat,
      requiredLon
    );

    const isWithinRadius = distance <= requiredRadius;

    if (!isWithinRadius) {
      await logAudit(studentId, "attendance_marked", "attendance", sessionId, {
        outcome: "failure",
        errorMessage: "Outside allowed location radius",
        location: { latitude, longitude },
      });
      return res.status(403).json({
        message: "You are outside the allowed classroom radius",
        distance,
      });
    }

    // 6. Check duplicate attendance
    const existing = await Attendance.findOne({
      sessionId,
      studentId,
    });
    if (existing) {
      return res.status(400).json({ message: "Attendance already marked" });
    }

    // 7. Save attendance
    const attendance = await Attendance.create({
      sessionId,
      courseId: session.courseId,
      studentId,
      status: "present",
      deviceValidation: {
        deviceId,
        isValidDevice: true,
      },
      locationValidation: {
        studentLatitude: latitude,
        studentLongitude: longitude,
        distance,
        isWithinRadius,
      },
      qrValidation: {
        sessionToken: qrToken,
        isValid: true,
      },
      metadata: {
        platform: req.body.platform || "android",
        appVersion: req.body.appVersion || "1.0.0",
      },
    });

    // 8. Log success
    await logAudit(studentId, "attendance_marked", "attendance", attendance._id, {
      outcome: "success",
      deviceId,
      location: { latitude, longitude },
    });

    return res.status(200).json({
      message: "Attendance marked successfully",
      attendanceId: attendance._id,
      distance,
    });
  } catch (err) {
    res.status(500).json({ message: "Attendance failed", error: err.message });
  }
};

/**
 * Helper: Create audit log entry
 */
async function logAudit(userId, action, entityType, entityId, details) {
  await AuditLog.create({
    userId,
    action,
    entityType,
    entityId,
    details,
    ipAddress: "0.0.0.0",
  });
}
