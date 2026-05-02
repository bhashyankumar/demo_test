const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/soldier_health')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Database Schema
const sensorSchema = new mongoose.Schema({
  bpm: Number,
  temp: Number,
  timestamp: { type: Date, default: Date.now }
});
const SensorData = mongoose.model('SensorData', sensorSchema);

// AI Rule-Based Logic
function generateAIResponse(bpm, temp) {
    if (bpm > 120 && temp > 38.0) {
        return "CRITICAL: Immediate attention required (High stress / Heat exhaustion).";
    } else if (bpm < 60 && temp < 35.0) {
        return "CRITICAL: Immediate attention required (Hypothermia / Bradycardia).";
    } else if (bpm > 100 || temp > 37.5) {
        return "WARNING: Possible stress or mild fever detected.";
    } else if (bpm >= 60 && bpm <= 100 && temp >= 36.0 && temp <= 37.5) {
        return "NORMAL: Soldier is in optimal condition.";
    } else {
        return "ALERT: Abnormal pattern detected – Monitor closely.";
    }
}

// Store latest data
let latestData = { bpm: 0, temp: 0, timestamp: null, aiMessage: "Waiting for data..." };

// ESP32 sends data here
app.post('/bpm', (req, res) => {
  try {
    const { bpm, temp } = req.body;
    
    // Validate data
    if (bpm === undefined || temp === undefined) {
      console.error('❌ Missing data - received:', req.body);
      return res.status(400).json({ success: false, error: 'Missing bpm or temp' });
    }
    
    // Calculate AI Message
    const aiMessage = generateAIResponse(bpm, temp);
    
    // Save to MongoDB asynchronously (fire and forget to not block Arduino response)
    const newData = new SensorData({ bpm, temp });
    newData.save().catch(err => console.error('❌ Failed to save to DB:', err));
    
    latestData = { bpm, temp, timestamp: new Date().toISOString(), aiMessage };
    console.log(`✅ Received - BPM: ${bpm} | Temp: ${temp}°C | Time: ${new Date().toLocaleTimeString()} | AI: ${aiMessage}`);
    res.json({ success: true, message: 'Data received' });
  } catch (err) {
    console.error('❌ Error parsing request:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Frontend gets data here
app.get('/latest', (req, res) => {
  res.json(latestData);
});

// Generate AI Tactical Report
app.get('/generate-report', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 4;

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(400).json({ success: false, error: 'GEMINI_API_KEY is not configured in the server .env file.' });
    }

    // Fetch data within timeframe
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const data = await SensorData.find({ timestamp: { $gte: cutoff } }).sort({ timestamp: 1 });
    
    if (data.length === 0) {
      return res.status(400).json({ success: false, error: `No data available in the last ${hours} hours.` });
    }

    // Sample data if it's too large to prevent prompt token limits
    let sampledData = data;
    if (data.length > 150) {
       const step = Math.floor(data.length / 150);
       sampledData = data.filter((_, idx) => idx % step === 0);
    }

    // Format data for the prompt
    let dataStr = "";
    sampledData.forEach((d) => {
      dataStr += `Time: ${new Date(d.timestamp).toLocaleTimeString()}, BPM=${d.bpm}, Temp=${d.temp.toFixed(1)}°C\n`;
    });

    const prompt = `You are an AI military medical assistant. Analyze the following biometrics of a soldier over the last ${hours} hours:
${dataStr}
Generate a concise, 3-4 sentence tactical health summary. Identify any trends like fatigue, stress, or heat exhaustion. Keep the tone professional, military-style, and actionable. Do not use markdown formatting like asterisks or bolding, just plain text.`;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    res.json({ success: true, report: responseText });
  } catch (err) {
    console.error('❌ Error generating report:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📍 Send Arduino data to: http://192.168.0.109:${PORT}/bpm`);
  console.log(`📊 Frontend fetches from: http://192.168.0.109:${PORT}/latest`);
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});