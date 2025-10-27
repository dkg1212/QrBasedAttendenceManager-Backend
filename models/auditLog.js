const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "attendance_marked",
        "session_created",
        "qr_generated",
        "device_registered",
        "login",
        "logout",
        "unauthorized_attempt",
      ],
    },
    entityType: {
      type: String,
      required: true,
      enum: ["attendance", "session", "user", "device", "course"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      deviceId: String,
      location: {
        latitude: Number,
        longitude: Number,
      },
      outcome: {
        type: String,
        enum: ["success", "failure", "warning"],
        default: "success",
      },
      errorMessage: String,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("auditLog", auditLogSchema);
