const API_URL = 'http://127.0.0.1:5000/latest';

// UI Elements
const bpmValue = document.getElementById('bpmValue');
const tempValue = document.getElementById('tempValue');
const navTime = document.getElementById('navTime');
const navDate = document.getElementById('navDate');
const statusIndicator = document.querySelector('.status-indicator');
const eventLog = document.getElementById('eventLog');

function logEvent(msg, typeClass = '') {
    if (!eventLog) return;
    const div = document.createElement('div');
    div.className = `log-entry ${typeClass}`;
    div.innerHTML = `<span style="color:#64748b;">[${getTimeStr()}]</span> <span>${msg}</span>`;
    eventLog.prepend(div);
    if (eventLog.children.length > 15) eventLog.lastChild.remove();
}

// Arrays for Chart
const maxDataPoints = 30; // 30 seconds
const timeLabels = Array(maxDataPoints).fill('');
const bpmData = Array(maxDataPoints).fill(null);

// Initialize Chart.js
const ctx = document.getElementById('bpmChart').getContext('2d');
const bpmChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [
            {
                label: 'BPM',
                data: bpmData,
                borderColor: '#10b981',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.4,
                fill: false
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#475569', font: { size: 10, family: 'Share Tech Mono' }, maxTicksLimit: 9 }
            },
            y: {
                min: 10, max: 200,
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: { 
                    color: '#475569', 
                    font: { size: 10, family: 'Share Tech Mono' }, 
                    stepSize: 20, 
                    callback: function(value, index, values) {
                        return [10, 50, 75, 100, 125, 165, 200].includes(value) ? value : '';
                    }
                }
            }
        }
    },
    plugins: [{
        id: 'horizontalLines',
        beforeDraw: (chart) => {
            const { ctx, chartArea: { left, right }, scales: { y } } = chart;
            ctx.save();

            // Red line at 100
            const y100 = y.getPixelForValue(100);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(left, y100);
            ctx.lineTo(right, y100);
            ctx.stroke();

            // Blue line at 50
            const y50 = y.getPixelForValue(50);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.beginPath();
            ctx.moveTo(left, y50);
            ctx.lineTo(right, y50);
            ctx.stroke();
            
            ctx.restore();
        }
    }]
});

// Initialize Leaflet Map
const map = L.map('leafletMap', {
    center: [17.537296, 78.385142], // Location
    zoom: 14,
    zoomControl: true,
    attributionControl: true
});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="width: 14px; height: 14px; background-color: #3b82f6; border-radius: 50%; box-shadow: 0 0 10px #3b82f6, inset 0 0 5px rgba(255,255,255,0.5); position: absolute; top: -7px; left: -7px;">
           </div>`,
});
L.marker([17.537296, 78.385142], { icon: customIcon }).addTo(map);

// Format current time HH:MM:SS
function getTimeStr() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

// Clock Update loop
setInterval(() => {
    const d = new Date();
    navTime.textContent = getTimeStr();
    navDate.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}, 1000);

// Data UI Update Loop
let lastInvalidMsg = "";

setInterval(() => {
    fetch(API_URL)
        .then(res => {
            if(!res.ok) throw new Error('Network Issue');
            return res.json();
        })
        .then(data => {
            const bpm = Number(data.bpm);
            const temp = Number(data.temp);

            const isBpmValid = Number.isFinite(bpm);
            const isTempValid = Number.isFinite(temp);

            let isAbnormal = false;
            let msg = "";

            if (!isBpmValid || !isTempValid) {
                msg = `INVALID SENSOR DATA: BPM=${data.bpm} | TEMP=${data.temp}`;
                isAbnormal = true;
            } else if (bpm > 100 || bpm < 50 || temp > 38 || temp < 35) {
                msg = `ABNORMAL READING: BPM=${bpm} | TEMP=${temp}`;
                isAbnormal = true;
            }

            if (isAbnormal) {
                if (msg !== lastInvalidMsg) {
                    logEvent(msg, 'log-error');
                    lastInvalidMsg = msg;
                }
            } else {
                lastInvalidMsg = "";
            }

            // Set Text
            bpmValue.textContent = isBpmValid ? bpm : '--';
            tempValue.textContent = isTempValid ? temp.toFixed(1) : '--';

            // Color Class Check BPM
            bpmValue.className = 'bio-value';
            let activeColor = '#10b981'; // green default for line
            
            if (isBpmValid) {
                if (bpm > 100) {
                    bpmValue.classList.add('red');
                    activeColor = '#ef4444';
                }
                else if (bpm < 50) {
                    bpmValue.classList.add('blue');
                    activeColor = '#3b82f6';
                }
                else {
                    bpmValue.classList.add('green');
                }
            } else {
                bpmValue.style.color = '#475569';
                activeColor = '#475569';
            }

            // Temp is always orange in the picture but let's do a basic color check
            tempValue.className = 'bio-value orange';
            if (!isTempValid) tempValue.style.color = '#475569';

            // Chart update
            timeLabels.push(getTimeStr());
            timeLabels.shift();
            bpmData.push(isBpmValid ? bpm : null);
            bpmData.shift();

            // Set line color dynamically if needed, though usually standard green in the mockup. Let's stick to green for the path.
            bpmChart.data.datasets[0].borderColor = '#10b981'; 
            bpmChart.update();

            // Top Status Indication
            if (isBpmValid) {
                if (bpm > 100 || bpm < 50 || temp > 38 || temp < 35) {
                    statusIndicator.innerHTML = `<span class="connected-dot" style="background:#ef4444; box-shadow: 0 0 8px #ef4444;"></span> CRITICAL`;
                    statusIndicator.style.color = '#ef4444';
                    statusIndicator.style.borderColor = 'rgba(239,68,68,0.3)';
                    statusIndicator.style.background = 'rgba(239,68,68,0.05)';
                } else {
                    statusIndicator.innerHTML = `<span class="connected-dot"></span> NORMAL`;
                    statusIndicator.style.color = '#10b981';
                    statusIndicator.style.borderColor = 'rgba(16,185,129,0.3)';
                    statusIndicator.style.background = 'rgba(16,185,129,0.05)';
                }
            }
        })
        .catch(err => console.error('Fetch error:', err));
        
}, 1000);

// Init Clock once
navTime.textContent = getTimeStr();
