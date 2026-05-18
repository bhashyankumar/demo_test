const API_URL = 'http://127.0.0.1:5000/latest';

document.addEventListener('DOMContentLoaded', () => {
  // Update nav time
  function updateTime() {
    const now = new Date();
    document.getElementById('navTime').innerText = now.toLocaleTimeString('en-US', { hour12: false });
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    document.getElementById('navDate').innerText = now.toLocaleDateString('en-GB', options);
  }
  setInterval(updateTime, 1000);
  updateTime();

  // UI Elements
  const statusIndicator = document.querySelector('.status-indicator');
  const incidentIdEl = document.getElementById('incidentId');
  const teamAssignedEl = document.getElementById('teamAssigned');
  const dispatchTimeEl = document.getElementById('dispatchTime');
  const medicContactEl = document.getElementById('medicContact');
  const etaDisplay = document.getElementById('etaDisplay');
  const cardHeaderBadge = document.querySelector('.panel-operative .header-badge');
  const avatarCircle = document.querySelector('.avatar-circle');

  // State
  let abnormalCounter = 0;
  let alertTriggered = false;
  let medicalTeamCounter = 0;
  let etaSeconds = 0;
  let etaInterval = null;

  function setStandbyMode() {
    statusIndicator.innerText = "STANDBY - NO EMERGENCY";
    statusIndicator.style.animation = "none";
    statusIndicator.style.backgroundColor = "rgba(148, 163, 184, 0.2)";
    statusIndicator.style.color = "#94a3b8";
    statusIndicator.style.borderColor = "#94a3b8";

    incidentIdEl.innerText = "--";
    teamAssignedEl.innerText = "--";
    dispatchTimeEl.innerText = "--";
    medicContactEl.innerText = "--";
    etaDisplay.innerText = "--:--";
    etaDisplay.style.color = "#94a3b8";

    cardHeaderBadge.innerText = "Normal";
    cardHeaderBadge.style.background = "rgba(16, 185, 129, 0.2)";
    cardHeaderBadge.style.color = "#10b981";
    cardHeaderBadge.style.borderColor = "#10b981";
    avatarCircle.style.borderColor = "#10b981";

    if (etaInterval) clearInterval(etaInterval);
  }

  function triggerEmergencyMode() {
    medicalTeamCounter++;
    
    statusIndicator.innerText = "ACTIVE INCIDENT";
    statusIndicator.style.animation = "pulse-red 2s infinite";
    statusIndicator.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
    statusIndicator.style.color = "#ef4444";
    statusIndicator.style.borderColor = "#ef4444";

    const d = new Date();
    const assignmentData = window.activeAssignments ? window.activeAssignments[0] : {};
    incidentIdEl.innerText = `INC-${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-M${medicalTeamCounter}`;
    teamAssignedEl.innerText = `M${medicalTeamCounter}`;
    dispatchTimeEl.innerText = d.toLocaleTimeString();
    medicContactEl.innerText = assignmentData.medicContact || "Dr. Sarah Jenkins";
    
    cardHeaderBadge.innerText = "Critical";
    cardHeaderBadge.style.background = "rgba(239, 68, 68, 0.2)";
    cardHeaderBadge.style.color = "#ef4444";
    cardHeaderBadge.style.borderColor = "#ef4444";
    avatarCircle.style.borderColor = "#ef4444";

    // Start 5 min ETA
    etaSeconds = 5 * 60;
    etaDisplay.style.color = "#3b82f6";
    
    if (etaInterval) clearInterval(etaInterval);
    etaInterval = setInterval(() => {
      if (etaSeconds <= 0) {
        etaDisplay.innerText = "00:00";
        etaDisplay.style.color = "#10b981"; // Green when arrived
        clearInterval(etaInterval);
        return;
      }
      const m = Math.floor(etaSeconds / 60);
      const s = etaSeconds % 60;
      etaDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      etaSeconds--;
    }, 1000);
  }

  // Initial standby
  setStandbyMode();

  // Polling Live Data (Replicating index.html logic)
  setInterval(() => {
    fetch(API_URL)
      .then(res => res.json())
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

        if (currentState === "ABNORMAL" || currentState === "INVALID") {
            abnormalCounter++;
            if (abnormalCounter >= 30 && !alertTriggered) {
                triggerEmergencyMode();
                alertTriggered = true;
            }
        } else {
            abnormalCounter = 0;
            if (alertTriggered) {
              setStandbyMode();
            }
            alertTriggered = false;
        }
      })
      .catch(err => console.error('Fetch error:', err));
  }, 1000);

  // Button Listeners
  document.getElementById('btnAcknowledge').addEventListener('click', () => {
    if(!alertTriggered) return alert("No active dispatch to acknowledge.");
    alert('Medical team assignment acknowledged by command.');
  });

  document.getElementById('btnUpdate').addEventListener('click', () => {
    if(!alertTriggered) return alert("No active dispatch.");
    alert(`Requesting status update from M${medicalTeamCounter}...`);
  });

  document.getElementById('btnCancel').addEventListener('click', () => {
    if(!alertTriggered) return alert("No active dispatch to cancel.");
    if (confirm('Are you sure you want to CANCEL this dispatch?')) {
      alert('Dispatch cancelled.');
      setStandbyMode();
      alertTriggered = false;
      abnormalCounter = 0; // Prevent immediate re-trigger
    }
  });
});
