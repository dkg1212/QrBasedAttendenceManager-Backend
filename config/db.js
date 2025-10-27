const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL)
  .then(() => console.log('DB connection established ✅'))
  } catch (err) {
    console.error('DB connection failed ❌', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
