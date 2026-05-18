const activeAssignments = [
  {
    incidentId: 'INC-20260518-A',
    soldierId: 'D-7',
    soldierName: 'Jaskirat Singh Rangi',
    unit: 'Research and Analysis Wing',
    bloodType: 'O+',
    teamAssigned: 'M1',
    status: 'Soldier Injured - Critical',
    dispatchTime: new Date().toISOString(),
    etaMinutes: 5,
    medicContact: 'Dr. Sanjeev Mehra'
  }
];

// If using modules, we would export this.
// But for vanilla JS included via script tags, it will just be available globally.
window.activeAssignments = activeAssignments;
