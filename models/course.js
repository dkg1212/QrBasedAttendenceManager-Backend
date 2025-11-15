const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 15,
    },
    courseName: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 150,
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    semester: {
      type: String,
      required: true,
      enum: ["Spring", "Fall", "Autumn"],
    },
    year: {
      type: Number,
      required: true,
      min: 2020,
      max: 2100,
    },
    department: {
      type: String,
      required: true,
      maxlength: 100,
    },
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location: {
      room: {
        type: String,

      },
      building: {
        type: String,

      },
      coordinates: {
        latitude: {
          type: Number,

          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,

          min: -180,
          max: 180,
        },
        radius: {
          type: Number,

          default: 50,
          min: 10,
          max: 500,
        },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("course", courseSchema);
