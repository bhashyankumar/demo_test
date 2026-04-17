const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Store latest data
let latestData = { bpm: 0, temp: 0, timestamp: null };

// ESP32 sends data here
app.post('/bpm', (req, res) => {
  try {
    const { bpm, temp } = req.body;
    
    // Validate data
    if (bpm === undefined || temp === undefined) {
      console.error('❌ Missing data - received:', req.body);
      return res.status(400).json({ success: false, error: 'Missing bpm or temp' });
    }
    
    latestData = { bpm, temp, timestamp: new Date().toISOString() };
    console.log(`✅ Received - BPM: ${bpm} | Temp: ${temp}°C | Time: ${new Date().toLocaleTimeString()}`);
    res.json({ success: true, message: 'Data received' });
  } catch (err) {
    console.error('❌ Error parsing request:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Frontend gets data here
app.get('/latest', (req, res) => {
  console.log('📡 Frontend requesting data:', latestData);
  res.json(latestData);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📍 Send Arduino data to: http://192.168.0.109:${PORT}/bpm`);
  console.log(`📊 Frontend fetches from: http://192.168.0.109:${PORT}/latest`);
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});