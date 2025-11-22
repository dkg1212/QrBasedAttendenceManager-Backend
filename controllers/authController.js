// controllers/authController.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { oauth2Client } = require('../utils/googleClient');
const User = require('../models/userModel');
const logAction = require("../middleware/logAction");


// Login with Google (auth-code flow), optional profile fields during first login
const googleAuth = async (req, res) => {
  try {
    
    const code = req.query.code;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    // Exchange auth code from popup flow
    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: 'postmessage',
    });
    oauth2Client.setCredentials(tokens);

    // OpenID Connect userinfo (has 'sub' identifier)
    const { data } = await axios.get(
      'https://openidconnect.googleapis.com/v1/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    // Expect: sub, email, name, picture
    const { sub, email, name, picture } = data;

    // Enforce tezu.ac.in
    if (!email?.toLowerCase().endsWith('@tezu.ac.in')) {
      return res.status(403).json({ message: 'Only tezu.ac.in emails are allowed' });
    }

    // Optional attributes from client during first login/complete profile
    const role = req.query.role; // 'student' | 'teacher' | 'admin'
    const rollNumber = req.query.rollNumber; // required if role = student
    const deviceId = req.query.deviceId; // required if role = student
    const department = req.query.department;
    const semester = req.query.semester;

    // Build updates
    const set = {
      name,
      email: email.toLowerCase(),
      googleId: sub,
      photoUrl: picture,
      lastLogin: new Date(),
    };
    if (role) set.role = role;
    if (department) set.department = department;
    if (semester) set.semester = semester;
    if (role === 'student') {
      if (!rollNumber || !deviceId) {
        return res.status(400).json({ message: 'rollNumber and deviceId are required for students' });
      }
      set.rollNumber = rollNumber;
      set.deviceId = deviceId;
    }

    // Upsert by googleId/email and validate schema rules
    const user = await User.findOneAndUpdate(
      { $or: [{ googleId: sub }, { email: email.toLowerCase() }] },
      { $set: set },
      { new: true, upsert: true, runValidators: true }
    );

    const token = jwt.sign(
      
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_TIMEOUT || '7d' }
    );
    await logAction({
  userId: user._id,
  action: "login",
  entityType: "user",
  entityId: user._id,
  details: { outcome: "success" },
  ip: req.ip,
});


    // NEW: include completeness signal and deviceId in response
    const profileComplete =
      !!user.role && (user.role !== 'student' || (!!user.rollNumber && !!user.deviceId));

    return res.status(200).json({
      user: {
        name: user.name,
        email: user.email,
        image: user.photoUrl,
        role: user.role,
        rollNumber: user.rollNumber,
        deviceId: user.deviceId,
        department: user.department,
        semester: user.semester,
        profileComplete,
      },
      token,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    await logAction({
      userId: null,
      action: "login",
      entityType: "user",
      entityId: null,
      details: { outcome: "failure", error: err.message },
      ip: req.ip,
    });
    return res.status(status).json({
      message: 'Google authentication failed',
      error: err?.response?.data || err.message,
    });
  }
};

// Update profile after login using JWT
const updateProfile = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded?.id;
    if (!userId) return res.status(401).json({ message: 'Invalid token' });

    const { role, rollNumber, deviceId, department, semester } = req.body || {};

    if (role === 'student' && (!rollNumber || !deviceId)) {
      return res
        .status(400)
        .json({ message: 'rollNumber and deviceId are required for students' });
    }

    const set = {};
    if (role) set.role = role;
    if (typeof department === 'string') set.department = department;
    if (typeof semester === 'string') set.semester = semester;
    if (role === 'student') {
      set.rollNumber = rollNumber;
      set.deviceId = deviceId;
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: set },
      { new: true, runValidators: true }
    );

    const profileComplete =
      !!updated.role && (updated.role !== 'student' || (!!updated.rollNumber && !!updated.deviceId));

    return res.status(200).json({
      user: {
        name: updated.name,
        email: updated.email,
        image: updated.photoUrl,
        role: updated.role,
        rollNumber: updated.rollNumber,
        deviceId: updated.deviceId,
        department: updated.department,
        semester: updated.semester,
        profileComplete,
      },
    });
  } catch (err) {
    const status = err.name === 'JsonWebTokenError' ? 401 : 500;
    return res.status(status).json({ message: 'Profile update failed', error: err.message });
  }
};

module.exports = {
  googleAuth,
  updateProfile,
};
