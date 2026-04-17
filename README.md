# Soldier Health Monitoring System

![UI Version](https://img.shields.io/badge/UI-Tactical_Dashboard-10b981?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-3b82f6?style=for-the-badge)

The **Soldier Health Monitoring System** is a real-time, high-tech tactical telemetry dashboard designed to track field operative biometrics. It integrates live data fetching, mapping, and charting into a dark-mode cyberpunk UI.

## 🚀 Features

- **Real-Time Biometrics**: Continuously fetches Heart Rate (BPM) and Core Temperature (°C) from live hardware or a simulated backend via HTTP polling.
- **Dynamic Thresholding**: Instantly analyzes biometric data to assign status levels (NORMAL, WARNING, CRITICAL) and color-codes readouts accordingly.
- **Heart Rate Charting**: Incorporates `Chart.js` to render a scrolling historical line graph of the operative's BPM.
- **Tactical GPS Map**: Employs `Leaflet` and OpenStreetMap (with custom inverted dark-mode filters) to track live operative geolocation (currently stationed in Hyderabad).
- **System Event Log**: Real-time console that actively monitors data integrity, logging invalid sensor readings or server connection failures.
- **Cyberpunk UI**: State-of-the-art interface utilizing CSS Grid/Flexbox, neon drop-shadows, scanline overlays, and highly legible tactical typography (Orbitron, Chakra Petch, Share Tech Mono).

## 🛠️ Technology Stack

- **Frontend Core**: HTML5, Vanilla JavaScript (ES6)
- **Styling**: Vanilla CSS3 (Custom properties, Flexbox, Animations)
- **Data Visualization**: `Chart.js` via CDN
- **Mapping**: `Leaflet` via CDN
- **Backend API**: Expects a local Python/Flask server at `http://127.0.0.1:5000/latest` 

## 📂 Project Structure

```text
/
├── public/                 # Client-facing assets
│   ├── index.html          # Main dashboard UI structure
│   ├── css/
│   │   └── style.css       # Layouts, Cyberpunk styling, Keyframe animations
│   └── js/
│       └── app.js          # Fetch logic, UI mounting, Map/Chart instantiation
├── backend.js              # Server script
├── package.json            # Node configuration
└── README.md               # Documentation
```

## ⚙️ Installation & Usage

1. **Start the Backend Server**:
   Ensure your backend data feed is running. The frontend relies on a REST endpoint operating at `http://127.0.0.1:5000/latest`.
   
   The endpoint should return JSON matching this schema:
   ```json
   {
     "bpm": 88,
     "temp": 36.9
   }
   ```

2. **Serve the Frontend**:
   Since the frontend comprises standard static assets, you can run it using any simple local server (to prevent CORS execution issues).
   ```bash
   npx serve public/
   # OR
   python -m http.server 8000 -d public/
   ```

3. **Monitor Operatives**:
   Open a browser to your local server url (e.g., `http://localhost:8000/index.html`). The dashboard will boot, attempt to establish a data-link with the server, and begin plotting the metrics.

## 🛡️ License

Classified / Proprietary. 
