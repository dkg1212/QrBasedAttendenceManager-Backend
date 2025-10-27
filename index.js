// index.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');

const app = express();
connectDB();
app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));



app.use('/auth', authRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server is running on ${process.env.PORT}`);
});
