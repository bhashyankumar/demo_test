const API_URL = 'http://127.0.0.1:5000/latest';

// UI Elements
const bpmValue = document.getElementById('bpmValue');
const tempValue = document.getElementById('tempValue');
const navTime = document.getElementById('navTime');
const navDate = document.getElementById('navDate');
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

            // Red line at 120
            const y120 = y.getPixelForValue(120);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(left, y120);
            ctx.lineTo(right, y120);
            ctx.stroke();

            // Blue line at 60
            const y60 = y.getPixelForValue(60);
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.beginPath();
            ctx.moveTo(left, y60);
            ctx.lineTo(right, y60);
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
let abnormalCounter = 0;
let alertTriggered = false;
let medicalTeamCounter = 0;

// --- Alarm Audio (Web Audio API) — Emergency Siren ---
let alarmAudioCtx = null;
let alarmNodes = [];
let alarmRafId = null;

function playAlarm() {
    stopAlarm();
    alarmAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = alarmAudioCtx;
    const now = ctx.currentTime;

    // Master gain — full volume
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);
    masterGain.connect(ctx.destination);

    // Compressor to keep it loud & punchy without clipping
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -6;
    compressor.knee.value = 3;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.05;
    compressor.connect(masterGain);

    // --- Layer 1: Wailing siren (LFO drives frequency of main oscillator) ---
    function createSirenLayer(baseFreq, wailRange, wailRate, type, gainVal, startOffset) {
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const oscGain = ctx.createGain();

        lfo.type = 'sine';
        lfo.frequency.value = wailRate;          // how fast it wails
        lfoGain.gain.value = wailRange;          // how wide the sweep is
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        osc.type = type;
        osc.frequency.value = baseFreq;
        oscGain.gain.setValueAtTime(0, now + startOffset);
        oscGain.gain.linearRampToValueAtTime(gainVal, now + startOffset + 0.05);

        osc.connect(oscGain);
        oscGain.connect(compressor);

        lfo.start(now + startOffset);
        osc.start(now + startOffset);
        alarmNodes.push(osc, lfo, lfoGain, oscGain);
    }

    // Main screeching wail: 900Hz ± 600Hz, 2 wails/sec
    createSirenLayer(900, 600, 2.0, 'sawtooth', 0.6, 0);
    // Backing tone: 600Hz ± 200Hz, offset phase for richness
    createSirenLayer(600, 200, 2.0, 'square',   0.35, 0.1);
    // High harmonic bite: 1800Hz ± 400Hz
    createSirenLayer(1800, 400, 2.0, 'sine',    0.25, 0);

    // --- Layer 2: Rapid klaxon chop (amplitude modulation at 8Hz) ---
    const chopLfo = ctx.createOscillator();
    const chopGain = ctx.createGain();
    chopLfo.type = 'square';
    chopLfo.frequency.value = 8;      // 8 chops per second
    chopGain.gain.value = 0.4;
    chopLfo.connect(chopGain);
    chopGain.connect(masterGain.gain); // modulate master volume
    chopLfo.start(now);
    alarmNodes.push(chopLfo, chopGain);

    alarmNodes.push(masterGain, compressor);
}

function stopAlarm() {
    alarmNodes.forEach(n => { try { n.stop && n.stop(); n.disconnect && n.disconnect(); } catch(_) {} });
    alarmNodes = [];
    if (alarmAudioCtx) { alarmAudioCtx.close(); alarmAudioCtx = null; }
}

const alertBanner     = document.getElementById('medicalAlertBanner');
const alertTeamName   = document.getElementById('alertTeamName');
const alertTimestamp  = document.getElementById('alertTimestamp');
const alertProgressFill  = document.getElementById('alertProgressFill');
const alertCounterBadge  = document.getElementById('alertCounterBadge');

function triggerMedicalAlert() {
    medicalTeamCounter++;
    alertTeamName.textContent = `M${medicalTeamCounter}`;
    alertTimestamp.textContent = getTimeStr();
    alertBanner.style.display = 'flex';
    logEvent(`[ALERT] MEDICAL TEAM M${medicalTeamCounter} ASSIGNED — 30s ABNORMAL CONDITION`, 'log-error');
    playAlarm();
}

function clearMedicalAlert() {
    alertBanner.style.display = 'none';
    stopAlarm();
}

function updateAlertProgress(count) {
    const pct = Math.min((count / 30) * 100, 100);
    alertProgressFill.style.width = pct + '%';
    alertCounterBadge.textContent = `${count} / 30`;
    // Badge colour transitions
    alertCounterBadge.className = 'alert-counter-badge';
    if (count >= 20) alertCounterBadge.classList.add('critical');
    else if (count >= 10) alertCounterBadge.classList.add('warn');
}

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

            let currentState = "NORMAL";

            if (!isBpmValid || !isTempValid) {
                currentState = "INVALID";
            } else if (bpm > 120 || bpm < 60 || temp > 50 || temp < 10) {
                currentState = "ABNORMAL";
            }

            // --- Consecutive Counter Logic ---
            if (currentState === "ABNORMAL" || currentState === "INVALID") {
                abnormalCounter++;
                if (abnormalCounter >= 30 && !alertTriggered) {
                    triggerMedicalAlert();
                    alertTriggered = true;
                }
            } else {
                abnormalCounter = 0;
                alertTriggered = false;
                clearMedicalAlert();
            }
            updateAlertProgress(abnormalCounter);

            // --- System Log ---
            let logTxt = "";
            let logType = "";
            if (currentState === "INVALID") {
                logTxt = `INVALID SENSOR DATA: BPM=${data.bpm} | TEMP=${data.temp}`;
                logType = "log-error";
            } else if (currentState === "ABNORMAL") {
                logTxt = `ABNORMAL READING: BPM=${bpm} | TEMP=${temp}`;
                logType = "log-error";
            } else {
                logTxt = `NORMAL READING: BPM=${bpm} | TEMP=${temp}`;
                logType = "";
            }
            
            logEvent(logTxt, logType);

            // Set Text
            bpmValue.textContent = isBpmValid ? bpm : '--';
            tempValue.textContent = isTempValid ? temp.toFixed(1) : '--';

            // Color Class Check BPM
            bpmValue.className = 'bio-value';
            let activeColor = '#10b981'; // green default for line
            
            if (isBpmValid) {
                if (bpm > 120) {
                    bpmValue.classList.add('red');
                    activeColor = '#ef4444';
                }
                else if (bpm < 60) {
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
        })
        .catch(err => console.error('Fetch error:', err));
        
}, 1000);

// Init Clock once
navTime.textContent = getTimeStr();