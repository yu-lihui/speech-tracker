// 1. Create the 'Memory Buckets' (Variables)
let correctCount = 0;
let incorrectCount = 0;

// invisible Excel spreadsheet
let allSessions = [];

// 2. Find the HTML elements so we can change them
const percentageDisplay = document.querySelector('.percentage');
const btnCorrect = document.querySelector('.correct');
const btnIncorrect = document.querySelector('.incorrect');
const correctDisplay = document.querySelector('#correct-count');
const incorrectDisplay = document.querySelector('#incorrect-count');
const btnReset = document.querySelector('#reset-btn');
const searchInput = document.querySelector('#search-client');

// Session Details tools
const saveBtn = document.querySelector('#save-btn');
const historyLog = document.querySelector('#history-log');
const clientInput = document.querySelector('#client-name');
const soundInput = document.querySelector('#speech-sound');
const levelInput = document.querySelector('#speech-level');

// Navigation tools
const navTracker = document.querySelector('#nav-tracker');
const navDashboard = document.querySelector('#nav-dashboard');
const trackerView = document.querySelector('#tracker-view');
const dashboardView = document.querySelector('#dashboard-view');

// 3. Create a Function to update the display
function updateAccuracy() {
    // STEP 1: CALCULATE (The "Brain Work")
    let total = correctCount + incorrectCount;
    let accuracy = 0;

    if (total > 0) {
        accuracy = Math.round((correctCount / total) * 100);
    }

    // STEP 2: DISPLAY (The "Visual Work")
    // Put these at the bottom so they have the newest math!
    percentageDisplay.textContent = accuracy + "%";
    correctDisplay.textContent = correctCount;
    incorrectDisplay.textContent = incorrectCount;
}

//3. Recipes (create functions)
// Create a function to reset the display
function resetAll() {
    correctCount = 0; // Reset the "let" memory
    incorrectCount = 0;
    updateAccuracy(); // Run the other function to fix the screen
}

function saveHistory() {
    // 1. JSON.stringify translates our Excel Sheet into a flat string of text
    // 2. We put that text into the localStorage warehouse
    localStorage.setItem('mySpeechSessions', JSON.stringify(allSessions));
}

function loadHistory() {
    // 1. Pull the text out of the warehouse
    const savedData = localStorage.getItem('mySpeechSessions');

    if (savedData) {
        // 2. JSON.parse translates the text BACK into a live Excel Sheet!
        allSessions = JSON.parse(savedData);
        // 3. Tell the artist to paint the screen
        redrawPills();
    }
}

function redrawPills() {
    // 1. Wipe the screen completely clean first
    historyLog.innerHTML = "";

    // 2. Read down the spreadsheet, row by row
    allSessions.forEach((session, index) => {
        const pill = document.createElement('div');
        pill.classList.add('history-pill');

        // We use session.name instead of just name now!
        pill.innerHTML = `
            <strong>${session.name}</strong>: ${session.sound} (${session.level}) - ${session.accuracy} 
            <br><small style="color: #95a5a6;">${session.date}</small>
            <span class="delete-btn" data-index="${index}" style="cursor: pointer; margin-left: 8px; color: #e63946; font-weight: bold; float: right;">&times;</span>
        `;

        historyLog.appendChild(pill);
    });
}

function showClientProgress(searchTerm) {
    const resultsContainer = document.querySelector('#client-history-results');
    resultsContainer.innerHTML = ""; // Clear the room first

    // 1. THE FILTER: Only grab sessions that match the name typed
    const filteredSessions = allSessions.filter(session =>
        session.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (filteredSessions.length === 0) {
        resultsContainer.innerHTML = `<p style="text-align:center; color:#95a5a6;">No sessions found for "${searchTerm}".</p>`;
        return;
    }

    filteredSessions.forEach(session => {
        const report = document.createElement('div');
        report.classList.add('history-pill');
        // We make these blue-ish to look different from the main tracker
        report.style.borderLeft = "5px solid #1d3557";

        report.innerHTML = `
            <strong>${session.date}</strong><br>
            Target: ${session.sound} (${session.level})<br>
            <strong>Accuracy: ${session.accuracy}</strong>
        `;
        resultsContainer.appendChild(report);
    });

}

function showAllGoalProgress(clientSessions) {
    const container = document.querySelector('#all-goals-container');
    container.innerHTML = ""; // Clear old bars

    if (clientSessions.length === 0) return;

    container.style.display = "block"; // Only "turn on" the lights when we have data!
    container.innerHTML = "";

    // 1. GROUPING: Create a list of unique goals (e.g., "/k/ Word", "/k/ Phrase")
    const goals = {};

    clientSessions.forEach(s => {
        const goalKey = `${s.sound} (${s.level})`; // e.g. "/k/ (Word)"
        if (!goals[goalKey]) {
            goals[goalKey] = { totalAccuracy: 0, count: 0 };
        }
        goals[goalKey].totalAccuracy += parseInt(s.accuracy);
        goals[goalKey].count += 1;
    });

    // 2. PAINTING: Create a bar for every unique goal found
    Object.keys(goals).forEach(goalName => {
        const data = goals[goalName];
        const avg = Math.round(data.totalAccuracy / data.count);

        const goalDiv = document.createElement('div');
        goalDiv.style.marginBottom = "15px";
        goalDiv.style.padding = "10px";
        goalDiv.style.background = "#f8f9fa";
        goalDiv.style.borderRadius = "8px";

        goalDiv.innerHTML = `
            <p style="margin-bottom: 5px; font-weight: bold; font-size: 14px;">
                ${goalName}: <span style="color: #1d3557;">${avg}% Avg</span>
            </p>
            <div style="width: 100%; background: #e9ecef; border-radius: 10px; height: 12px;">
                <div style="width: ${avg}%; height: 100%; background: #457b9d; border-radius: 10px; transition: width 0.8s ease;"></div>
            </div>
        `;
        container.appendChild(goalDiv);
    });
}

function downloadCSV() {
    const searchTerm = document.querySelector('#search-client').value;
    const sessionsToExport = allSessions.filter(s => 
        s.name.toLowerCase() === searchTerm.toLowerCase()
    );

    if (sessionsToExport.length === 0) return alert("No data to download!");

    // Create the CSV Header
    let csvContent = "Date,Client,Sound,Level,Accuracy\n";

    // Add each row
    sessionsToExport.forEach(s => {
        csvContent += `${s.date},${s.name},${s.sound},${s.level},${s.accuracy}\n`;
    });

    // Create a hidden "download link" and click it automatically
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `${searchTerm}_Progress_Report.csv`);
    a.click();
}

// 4. Tell the buttons to listen for clicks
btnCorrect.addEventListener('click', () => {
    correctCount++; // Adds 1
    updateAccuracy();
});

btnIncorrect.addEventListener('click', () => {
    incorrectCount++; // Adds 1
    updateAccuracy();
});

btnReset.addEventListener('click', resetAll);

// The UPGRADED Save Button (with the Level and Delete button!)
saveBtn.addEventListener('click', () => {
    // Package data into a neat JSON row
    const newSession = {
        name: clientInput.value || "Unknown",
        sound: soundInput.value || "General",
        level: levelInput.value,
        accuracy: percentageDisplay.textContent,
        date: new Date().toLocaleDateString('en-GB')
    };

    // Push this new row into our invisible excel sheet
    allSessions.push(newSession);

    // Save the new sheet, and redraw the screen
    saveHistory();
    redrawPills();
});

// JSON Master Delete Listener
historyLog.addEventListener('click', (event) => {
    if (event.target.classList.contains('delete-btn')) {
        // 1. Find out exactly which row number we clicked on
        const rowIndex = event.target.getAttribute('data-index');

        // 2. splice() cuts that exact row out of our Excel Sheet
        allSessions.splice(rowIndex, 1);

        // 3. Save the new, smaller sheet, and redraw the screen!
        saveHistory();
        redrawPills();
    }
});

// Search trigger
searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    const resultsContainer = document.querySelector('#client-history-results');

    if (term.length > 0) {
        showClientProgress(term);

        // Find all sessions for this specific child
        const clientSessions = allSessions.filter(s =>
            s.name.toLowerCase() === term.toLowerCase()
        );

        // Tell the new Artist to draw all the different goal bars
        showAllGoalProgress(clientSessions);

    } else {
        goalContainer.innerHTML = "";
        goalContainer.style.display = "none"; // Physically hide the container when search is empty
        resultsContainer.innerHTML = `<p style="text-align:center; color:#95a5a6;">Search for a client to see their progress history.</p>`;
    }
});

// Download button trigger
document.querySelector('#download-csv').addEventListener('click', downloadCSV);

// NAVIGATION LOGIC (Switching Rooms)
navTracker.addEventListener('click', () => {
    navTracker.classList.add('active');
    navDashboard.classList.remove('active');
    trackerView.classList.remove('hidden');
    dashboardView.classList.add('hidden');

    // THE FIX: Hide the progress bars when we leave the dashboard
    const goalContainer = document.querySelector('#all-goals-container');
    goalContainer.innerHTML = "";
    goalContainer.style.display = "none"; // This hides the gray box/gap entirely
    // Also clear the search box so it's fresh for next time
    document.querySelector('#search-client').value = "";

    // Clear the results message too
    document.querySelector('#client-history-results').innerHTML = `<p style="text-align:center; color:#95a5a6;">Search for a client to see their progress history.</p>`;
});

navDashboard.addEventListener('click', () => {
    navDashboard.classList.add('active');
    navTracker.classList.remove('active');
    dashboardView.classList.remove('hidden');
    trackerView.classList.add('hidden');
});

// KICKSTART THE APP: Load any saved data immediately
loadHistory();
