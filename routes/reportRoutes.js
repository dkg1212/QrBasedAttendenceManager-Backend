const express = require("express");
const router = express.Router();

const {
  studentMonthlyReport,
  courseWiseReport,
  studentCourseReport,
  semesterReport,
} = require("../controllers/reportController");

const verifyJWT = require("../middleware/verifyJWT");

// Student monthly report
router.get("/student/monthly", verifyJWT, studentMonthlyReport);

// Course-wise report (teacher/admin)
router.get("/course/:courseId", verifyJWT, courseWiseReport);

// Student course-wise report
router.get("/student/course/:courseId", verifyJWT, studentCourseReport);

// Semester report
router.get("/student/semester", verifyJWT, semesterReport);

module.exports = router;
