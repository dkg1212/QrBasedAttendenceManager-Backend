const Attendance = require("../models/attendance");
const Course = require("../models/course");
const User = require("../models/userModel");
const AttendanceReport = require("../models/attendanceReport");

/**
 * Student Monthly Report
 */
exports.studentMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    const studentId = req.user.id;

    const sessions = await Attendance.aggregate([
      {
        $match: {
          studentId,
          timestamp: {
            $gte: new Date(year, month - 1, 1),
            $lte: new Date(year, month, 0),
          },
        },
      },
      {
        $group: {
          _id: "$courseId",
          totalSessions: { $sum: 1 },
          attended: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        },
      },
    ]);

    const response = sessions.map((item) => ({
      courseId: item._id,
      totalSessions: item.totalSessions,
      attended: item.attended,
      percentage: ((item.attended / item.totalSessions) * 100).toFixed(2),
      lateCount: item.lateCount,
    }));

    return res.status(200).json({ studentId, month, year, report: response });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};

/**
 * Course-wise report (teacher/admin)
 */
exports.courseWiseReport = async (req, res) => {
  try {
    const { courseId } = req.params;

    const data = await Attendance.aggregate([
      { $match: { courseId } },
      {
        $group: {
          _id: "$studentId",
          totalSessions: { $sum: 1 },
          attended: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        },
      },
    ]);

    const formatted = data.map((item) => ({
      studentId: item._id,
      totalSessions: item.totalSessions,
      attended: item.attended,
      percentage: ((item.attended / item.totalSessions) * 100).toFixed(2),
      lateCount: item.lateCount,
    }));

    return res.status(200).json({ courseId, report: formatted });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};

/**
 * Student course-wise report for a semester
 */
exports.studentCourseReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseId } = req.params;

    const data = await Attendance.aggregate([
      { $match: { courseId, studentId } },
      {
        $group: {
          _id: "$studentId",
          totalSessions: { $sum: 1 },
          attended: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          lateCount: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        },
      },
    ]);

    if (!data.length)
      return res.status(200).json({
        message: "No attendance record found for this course",
      });

    const report = {
      studentId,
      courseId,
      totalSessions: data[0].totalSessions,
      attended: data[0].attended,
      percentage:
        ((data[0].attended / data[0].totalSessions) * 100).toFixed(2),
      lateCount: data[0].lateCount,
    };

    return res.status(200).json(report);
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};

/**
 * Semester report (admin/student)
 */
exports.semesterReport = async (req, res) => {
  try {
    const { semester } = req.query;
    const studentId = req.user.id;

    const data = await Attendance.aggregate([
      { $match: { studentId } },
      {
        $lookup: {
          from: "courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: "$course" },
      { $match: { "course.semester": semester } },
      {
        $group: {
          _id: "$courseId",
          totalSessions: { $sum: 1 },
          attended: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        },
      },
    ]);

    const formatted = data.map((item) => ({
      courseId: item._id,
      totalSessions: item.totalSessions,
      attended: item.attended,
      percentage: ((item.attended / item.totalSessions) * 100).toFixed(2),
    }));

    return res.status(200).json({
      studentId,
      semester,
      report: formatted,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate report", error: err.message });
  }
};
