const express = require("express");
const router = express.Router();

const { markAttendance } = require("../controllers/attendanceController");
const verifyJWT = require("../middleware/verifyJWT");

router.post("/mark", verifyJWT, markAttendance);

module.exports = router;
