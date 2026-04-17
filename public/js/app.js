// c:\Users\vinay\demo_test\public\js\app.js

const API_URL = 'http://127.0.0.1:5000/latest';

const bpmValue = document.getElementById('bpmValue');
const tempValue = document.getElementById('tempValue');
const bpmContainer = document.getElementById('bpmContainer');
const tempContainer = document.getElementById('tempContainer');
const errorBanner = document.getElementById('errorBanner');
const eventLog = document.getElementById('eventLog');

// Status threshold logic preserved from original code
function getStatusClass(bpm, temp) {
    if (bpm > 120 || bpm < 40 || temp > 38.5 || temp < 35) {
        return 'status-critical';
    } else if (bpm > 100 || bpm < 50 || temp > 37.5 || temp < 36) {
        return 'status-warning';
    }
    return 'status-normal';
}

function getStatusMessage(statusClass) {
    if (statusClass === 'status-critical') return 'CRITICAL VITALS DETECTED';
    if (statusClass === 'status-warning') return 'VITALS OUTSIDE OPTIMAL RANGE';
    return 'VITALS STABLE';
}

// Ensure unique log messages unless state changes
let currentStatus = null;

function addLogEntry(message, type) {
    const timeStr = formatTimestamp(new Date());
    const logHTML = `
        <div class="log-entry ${type}">
          <div class="log-time">[${timeStr}]</div>
          <div class="log-msg">${message}</div>
        </div>
    `;
    eventLog.insertAdjacentHTML('afterbegin', logHTML);

    // Keep log max 10 entries avoiding memory bloat
    if (eventLog.children.length > 8) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

function formatTimestamp(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}:${ms}`;
}

function updateUI(data) {
    // Hide error banner when data is received
    errorBanner.classList.remove('active');

    const bpm = Number(data.bpm);
    const temp = Number(data.temp);

    const isBpmValid = Number.isFinite(bpm);
    const isTempValid = Number.isFinite(temp);

    bpmValue.textContent = isBpmValid ? bpm : '--';
    tempValue.textContent = isTempValid ? temp.toFixed(1) : '--';

    if (isBpmValid && isTempValid) {
        const newStatusClass = getStatusClass(bpm, temp);
        
        bpmContainer.className = `metric-content ${newStatusClass}`;
        tempContainer.className = `metric-content ${newStatusClass}`;

        if (newStatusClass !== currentStatus) {
            let logType = 'log-info';
            if (newStatusClass === 'status-warning') logType = 'log-warning';
            if (newStatusClass === 'status-critical') logType = 'log-critical';
            
            addLogEntry(getStatusMessage(newStatusClass), logType);
            currentStatus = newStatusClass;
        }
    } else {
        bpmContainer.className = 'metric-content status-waiting';
        tempContainer.className = 'metric-content status-waiting';
    }
}

// Clock Setup
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');
const initLog = document.getElementById('initLog');

function updateClock() {
    const now = new Date();
    clockTime.textContent = String(now.getHours()).padStart(2, '0') + ':' + 
                            String(now.getMinutes()).padStart(2, '0') + ':' + 
                            String(now.getSeconds()).padStart(2, '0');
    
    clockDate.textContent = now.toLocaleDateString('en-US', { 
        year: 'numeric', month: 'short', day: '2-digit' 
    }).toUpperCase();
}

setInterval(updateClock, 1000);
updateClock();

// Set Init Log time
if (initLog) {
  initLog.querySelector('.log-time').textContent = `[${formatTimestamp(new Date())}]`;
}

let errorLogged = false;

// Poll every 1 second (from original logic)
setInterval(() => {
    fetch(API_URL)
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            errorLogged = false;
            updateUI(data);
        })
        .catch(err => {
            if (!errorLogged) {
                console.error('Error:', err);
                errorBanner.classList.add('active');
                addLogEntry('DATALINK DISRUPTED: UNABLE TO REACH UPLINK SERVER', 'log-critical');
                
                bpmContainer.className = 'metric-content status-waiting';
                tempContainer.className = 'metric-content status-waiting';
                bpmValue.textContent = '--';
                tempValue.textContent = '--';
                currentStatus = null;
                errorLogged = true;
            }
        });
}, 1000);
