// Initialize Supabase correctly for browser use
const { createClient } = supabase; // This grabs the tool from the script tag

const supabaseUrl = 'https://meypivmccykkqtazcrma.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1leXBpdm1jY3lra3F0YXpjcm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTk0MzYsImV4cCI6MjA5MTI5NTQzNn0.AZszBKbiqIVq5A3vFSzB-uZDRE6bGSZYTcAg0xKVTv4';

// We use 'db' here to keep it distinct and easy for the functions to find
const db = createClient(supabaseUrl, supabaseKey);

// --- NEW: AUTHENTICATION LOGIC ---
async function checkUser() {
    const { data: { user } } = await db.auth.getUser();
    if (user) {
        document.getElementById('auth-overlay').style.display = 'none';
        loadHistory(); // Only load history if we are logged in
    }
}

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login failed: " + error.message);
    } else {
        document.getElementById('auth-overlay').style.display = 'none';
        loadHistory();
    }
});

// Run this check immediately
checkUser();

// 1. Memory Buckets
let correctCount = 0;
let incorrectCount = 0;
let allSessions = []; 

// 2. HTML Element Selectors
const percentageDisplay = document.querySelector('.percentage');
const btnCorrect = document.querySelector('.correct');
const btnIncorrect = document.querySelector('.incorrect');
const correctDisplay = document.querySelector('#correct-count');
const incorrectDisplay = document.querySelector('#incorrect-count');
const btnReset = document.querySelector('#reset-btn');
const searchInput = document.querySelector('#search-client');
const saveBtn = document.querySelector('#save-btn');
const historyLog = document.querySelector('#history-log');
const clientInput = document.querySelector('#client-name');
const soundInput = document.querySelector('#speech-sound');
const levelInput = document.querySelector('#speech-level');
const navTracker = document.querySelector('#nav-tracker');
const navDashboard = document.querySelector('#nav-dashboard');
const trackerView = document.querySelector('#tracker-view');
const dashboardView = document.querySelector('#dashboard-view');

// 3. CLOUD FUNCTIONS

// LOAD data from Supabase
async function loadHistory() {
    const { data, error } = await db
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading cloud data:', error);
    } else {
        allSessions = data;
        redrawPills();
    }
}

// SAVE data to Supabase
async function saveToCloud(sessionObject) {
    const { error } = await db
        .from('sessions')
        .insert([sessionObject]);

    if (error) {
        console.error('Cloud Save Error:', error);
        alert("Failed to save to cloud. Check if your column names match!");
    } else {
        loadHistory(); 
    }
}

// DELETE data from Supabase
async function deleteFromCloud(id) {
    // 1. Immediate UI update (makes the app feel snappy)
    allSessions = allSessions.filter(s => s.id !== id);
    redrawPills();

    // 2. Delete from the Cloud
    const { error } = await db
        .from('sessions')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Delete error:', error);
        alert("Could not delete from cloud: " + error.message);
        loadHistory(); // Reload from cloud to restore the pill if delete failed
    }
}
// 4. CORE APP LOGIC

function updateAccuracy() {
    let total = correctCount + incorrectCount;
    let accuracy = (total > 0) ? Math.round((correctCount / total) * 100) : 0;

    percentageDisplay.textContent = accuracy + "%";
    correctDisplay.textContent = correctCount;
    incorrectDisplay.textContent = incorrectCount;
    return accuracy;
}

function resetAll() {
    correctCount = 0;
    incorrectCount = 0;
    updateAccuracy();
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
}

function redrawPills() {
    historyLog.innerHTML = "";
    allSessions.forEach((session) => {
        const pill = document.createElement('div');
        pill.classList.add('history-pill');
        pill.style.cssText = "border: 1px solid #1d3557; margin-bottom: 10px; padding: 12px; padding-right: 40px; border-radius: 8px; position: relative; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";

        const displayDate = new Date(session.created_at).toLocaleDateString('en-GB');

        pill.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <strong style="color: #1d3557; font-size: 14px;">${session.client_name}</strong>: ${session.sound}
                    <div style="font-size: 11px; color: #7f8c8d; margin-top: 2px;">
                        ${session.level} | Cues: ${session.prompt}
                    </div>
                    <div style="font-size: 10px; color: #bdc3c7; margin-top: 2px;">${displayDate}</div>
                </div>
                <div style="text-align: right; margin-left: 10px;">
                    <span style="font-size: 18px; font-weight: bold; color: ${session.accuracy >= 80 ? '#2a9d8f' : '#e76f51'};">
                        ${session.accuracy}%
                    </span>
                </div>
            </div>
            <span class="delete-btn" 
                onclick="deleteFromCloud('${session.id}')" 
                style="cursor: pointer; position: absolute; top: 10px; right: 10px; color: #e63946; font-size: 22px; line-height: 1; padding: 5px 8px;">
                  &times;
            </span>
        `;
        historyLog.appendChild(pill);
    });
}

function displayClientHistory(clientName) {
    const container = document.getElementById('all-goals-container');
    const messageArea = document.getElementById('client-history-results');
    const clientData = allSessions.filter(h => h.client_name.toLowerCase() === clientName.toLowerCase());

    container.innerHTML = '';
    if (clientData.length === 0) {
        messageArea.innerHTML = `<p style="text-align:center; color:#95a5a6;">No sessions found for "${clientName}".</p>`;
        return;
    } 
    messageArea.innerHTML = "";

    const groups = {};
    clientData.forEach(entry => {
        if (!groups[entry.sound]) groups[entry.sound] = [];
        groups[entry.sound].push(entry);
    });

    for (const sound in groups) {
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.style.cssText = "margin-bottom:20px; border:1px solid #1d3557; border-radius:10px; overflow:hidden; background:white;";

        let rows = groups[sound]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(entry => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:10px;">${entry.level}</td>
                    <td style="padding:10px; color:#7f8c8d;">${entry.prompt || 'Indpt'}</td>
                    <td style="padding:10px; text-align:center; font-weight:bold; color:${entry.accuracy >= 80 ? '#2a9d8f' : '#e76f51'}">
                        ${entry.accuracy}%
                    </td>
                    <td style="padding:10px; text-align:right; font-size:10px; color:#bdc3c7;">${new Date(entry.created_at).toLocaleDateString('en-GB')}</td>
                </tr>
            `).join('');

        card.innerHTML = `
            <div style="background:#1d3557; color:white; padding:10px; font-weight:bold; text-align:center;">${sound}</div>
            <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="background:#f8f9fa; border-bottom:1px solid #ddd;">
                        <th style="padding:8px; text-align:left;">Level</th>
                        <th style="padding:8px; text-align:left;">Cues</th>
                        <th style="padding:8px; text-align:center;">Acc%</th>
                        <th style="padding:8px; text-align:right;">Date</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
        container.appendChild(card);
    }
}

// 5. EVENT LISTENERS

btnCorrect.addEventListener('click', () => { correctCount++; updateAccuracy(); });
btnIncorrect.addEventListener('click', () => { incorrectCount++; updateAccuracy(); });
btnReset.addEventListener('click', resetAll);

saveBtn.addEventListener('click', async () => {
    const currentAccuracy = updateAccuracy();
    const soundVal = soundInput.value || "General";
    const positionVal = document.getElementById('speech-position').value || "";

    const newSession = {
        client_name: clientInput.value || "Unknown",
        sound: `${soundVal} ${positionVal}`.trim(),
        level: levelInput.value,
        prompt: getSelectedCues(),
        correct: correctCount,
        incorrect: incorrectCount,
        accuracy: currentAccuracy
    };

    await saveToCloud(newSession);
    alert(`Session saved!`);
    resetAll();
});

searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim();
    if (term.length > 0) displayClientHistory(term);
    else {
        document.getElementById('all-goals-container').innerHTML = "";
        document.getElementById('client-history-results').innerHTML = `<p style="text-align:center; color:#95a5a6;">Search for a client to see progress history.</p>`;
    }
});

navTracker.addEventListener('click', () => {
    navTracker.classList.add('active');
    navDashboard.classList.remove('active');
    trackerView.classList.remove('hidden');
    dashboardView.classList.add('hidden');

    // PRIVACY WIPE: Clear history when leaving the dashboard
    document.getElementById('all-goals-container').innerHTML = "";
    document.getElementById('search-client').value = "";
    document.getElementById('client-history-results').innerHTML = `<p style="text-align:center; color:#95a5a6;">Search for a client to see progress history.</p>`;
});

navDashboard.addEventListener('click', () => {
    navDashboard.classList.add('active');
    navTracker.classList.remove('active');
    dashboardView.classList.remove('hidden');
    trackerView.classList.add('hidden');
});

document.getElementById('prompt-chips').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) e.target.classList.toggle('selected');
});

function getSelectedCues() {
    const selected = Array.from(document.querySelectorAll('.chip.selected')).map(c => c.getAttribute('data-value'));
    return selected.length > 0 ? selected.join(', ') : 'Indpt';
}

// Logout Logic
document.getElementById('logout-btn').addEventListener('click', async () => {
    const { error } = await db.auth.signOut();
    if (error) {
        alert("Error logging out: " + error.message);
    } else {
        // Refresh the page to bring back the login overlay
        window.location.reload();
    }
});
