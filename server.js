import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();
const app = express();
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
  res.send('🚀 Node.js + PostgreSQL Demo App is running!');
});

// Example DB route
app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ message: 'DB connected!', time: result.rows[0].current_time });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

