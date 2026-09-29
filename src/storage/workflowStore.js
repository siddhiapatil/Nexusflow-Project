// src/storage/workflowStore.js
const fs = require('fs');
const path = require('path');

// Path to a local history log file
const HISTORY_FILE = path.join(__dirname, '../../execution_history.json');

// Ensure history file exists
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
}

// Save a new execution run to storage
function saveExecutionRun(workflowData) {
  try {
    const rawData = fs.readFileSync(HISTORY_FILE, 'utf8');
    const history = JSON.parse(rawData);

    const runRecord = {
      id: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...workflowData
    };

    history.push(runRecord);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    return runRecord;
  } catch (error) {
    throw new Error(`Storage Error: Failed to save execution history - ${error.message}`);
  }
}

// Retrieve all past execution runs
function getExecutionHistory() {
  try {
    const rawData = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    throw new Error(`Storage Error: Failed to retrieve history - ${error.message}`);
  }
}

module.exports = { saveExecutionRun, getExecutionHistory };