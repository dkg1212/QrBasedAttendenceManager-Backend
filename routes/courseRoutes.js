const express = require("express");
const router = express.Router();

const {
  createCourse,
  updateCourse,
  enrollStudent,
  getTeacherCourses,
  getStudentCourses,
  getCourseById,
} = require("../controllers/courseController");

const verifyJWT = require("../middleware/verifyJWT");

// Teacher/Admin creates course
router.post("/create", verifyJWT, createCourse);

// Update course
router.put("/:id", verifyJWT, updateCourse);

// Enroll student
router.post("/enroll", verifyJWT, enrollStudent);

// Fetch teacher courses
router.get("/teacher", verifyJWT, getTeacherCourses);

// Fetch student courses
router.get("/student", verifyJWT, getStudentCourses);

// Fetch single course
router.get("/:id", verifyJWT, getCourseById);

module.exports = router;
