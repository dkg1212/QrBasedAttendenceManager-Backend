const Course = require("../models/course");
const User = require("../models/userModel");

/**
 * Create a new course (teacher or admin)
 */
exports.createCourse = async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      semester,
      year,
      department,
      location,
    } = req.body;

    const teacherId = req.user.id; // from JWT

    const course = await Course.create({
      courseCode,
      courseName,
      semester,
      year,
      department,
      teacherId,
      location,
    });

    return res.status(201).json({
      message: "Course created successfully",
      course,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create course", error: err.message });
  }
};

/**
 * Update course details (teacher/admin)
 */
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Course.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ message: "Course not found" });

    return res.status(200).json({
      message: "Course updated successfully",
      course: updated,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update course", error: err.message });
  }
};

/**
 * Enroll a student into a course
 */
exports.enrollStudent = async (req, res) => {
  try {
    const { courseId, studentId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(400).json({ message: "Invalid student" });
    }

    // Prevent duplicate enrollment
    if (course.enrolledStudents.includes(studentId)) {
      return res.status(400).json({ message: "Student already enrolled" });
    }

    course.enrolledStudents.push(studentId);
    await course.save();

    return res.status(200).json({
      message: "Student enrolled successfully",
      course,
    });
  } catch (err) {
    res.status(500).json({ message: "Enrollment failed", error: err.message });
  }
};

/**
 * Get all courses assigned to a teacher
 */
exports.getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const courses = await Course.find({ teacherId });

    return res.status(200).json({ courses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses", error: err.message });
  }
};

/**
 * Get courses for a student (enrolled)
 */
exports.getStudentCourses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const courses = await Course.find({
      enrolledStudents: studentId,
    });

    return res.status(200).json({ courses });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student courses", error: err.message });
  }
};

/**
 * Get course by ID
 */
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ message: "Course not found" });

    return res.status(200).json({ course });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch course", error: err.message });
  }
};
