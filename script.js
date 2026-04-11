// Initialize Supabase correctly for browser use
const { createClient } = supabase; // This grabs the tool from the script tag

const supabaseUrl = 'https://meypivmccykkqtazcrma.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1leXBpdm1jY3lra3F0YXpjcm1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTk0MzYsImV4cCI6MjA5MTI5NTQzNn0.AZszBKbiqIVq5A3vFSzB-uZDRE6bGSZYTcAg0xKVTv4';

// We use 'db' here to keep it distinct and easy for the functions to find
const db = createClient(supabaseUrl, supabaseKey);

// --- NEW: AUTHENTICATION LOGIC ---
async function checkUser() {
    const { data: { user } } = await db.auth.getUser();
    const header = document.getElementById('account-header');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (header) header.style.display = 'flex'; // Reveal header
        document.getElementById('user-display-email').textContent = user.email;

        // NEW: Scroll to top so the Client Name box is visible
        window.scrollTo(0, 0);
        
        loadHistory();
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (header) header.style.display = 'none'; // Keep hidden
    }
}

// Handle Sign Up Click
document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    const { data, error } = await db.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        alert("Sign up error: " + error.message);
    } else {
        alert("Account created! You can now log in.");
    }
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login failed: " + error.message);
    } else {
        // Success!
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('account-header').style.display = 'flex'; // Show the header!

        // NEW: Scroll to top immediately after login
        window.scrollTo(0, 0);
        
        const { data: { user } } = await db.auth.getUser();
        document.getElementById('user-display-email').textContent = user.email;
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
    const { data: { user } } = await db.auth.getUser();
    
    if (!user) return;

    const { data, error } = await db
        .from('sessions')
        .select('*')
        .eq('user_id', user.id) // <--- ONLY LOAD MY DATA
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading:', error);
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
        pill.classList.add('history-pill'); // CSS file handles the border and padding now!

        const dateObj = new Date(session.created_at);
        const displayDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

        pill.innerHTML = `
            <div class="pill-content">
                <div class="pill-info">
                    <strong class="pill-client">${session.client_name}</strong>: 
                    <strong class="pill-sound">${session.sound}</strong>
                    
                    <div class="pill-details">
                        <span>${session.level}</span> | Cues: <span>${session.prompt}</span>
                    </div>
                    
                    <div class="pill-date">${displayDate}</div>
                </div>
                <div class="pill-accuracy">
                    <span style="color: ${session.accuracy >= 80 ? '#2a9d8f' : '#e76f51'};">
                        ${session.accuracy}%
                    </span>
                </div>
            </div>
            <span class="delete-btn" 
                onclick="deleteFromCloud('${session.id}')" 
                style="cursor: pointer; position: absolute; top: 8px; right: 8px; color: #e63946; font-size: 22px; line-height: 1; padding: 5px 8px;">
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
    card.className = 'goal-card'; // Controlled by CSS now

    let rows = groups[sound]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(entry => `
            <tr class="goal-row">
                <td class="cell-level">${entry.level}</td>
                <td class="cell-cues">${entry.prompt || 'Indpt'}</td>
                <td class="cell-acc" style="color:${entry.accuracy >= 80 ? '#2a9d8f' : '#e76f51'}">
                    ${entry.accuracy}%
                </td>
                <td class="cell-date">${new Date(entry.created_at).toLocaleDateString('en-GB')}</td>
            </tr>
        `).join('');

    card.innerHTML = `
        <div class="goal-header">${sound}</div>
        <table class="goal-table">
            <thead>
                <tr>
                    <th>Level</th>
                    <th>Cues</th>
                    <th>Acc%</th>
                    <th>Date</th>
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
    const { data: { user } } = await db.auth.getUser();
    
    if (!user) {
        alert("Session expired. Please log in again.");
        window.location.reload();
        return;
    }

    const currentAccuracy = updateAccuracy();
    const soundVal = soundInput.value || "General";
    const positionVal = document.getElementById('speech-position').value || "";

    // CLEANED UP: Removes the extra "concepts" logic and fixed the syntax error
    const combinedSound = `${soundVal} ${positionVal}`.trim();

    const newSession = {
        client_name: clientInput.value || "Unknown",
        sound: combinedSound, 
        level: levelInput.value,
        prompt: getSelectedCues(),
        correct: correctCount,
        incorrect: incorrectCount,
        accuracy: currentAccuracy,
        user_id: user.id 
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

// --- CUE CHIPS LOGIC ---
document.getElementById('prompt-chips').addEventListener('click', (e) => {
    // Check if what was clicked is actually a chip button
    if (e.target.classList.contains('chip')) {
        // Toggle the 'selected' class (changes color)
        e.target.classList.toggle('selected');
        
        // Optional: If 'Independent' is selected, deselect others
        if (e.target.getAttribute('data-value') === 'Indpt' && e.target.classList.contains('selected')) {
            const allChips = document.querySelectorAll('.chip');
            allChips.forEach(chip => {
                if (chip.getAttribute('data-value') !== 'Indpt') {
                    chip.classList.remove('selected');
                }
            });
        }
    }
});

// Helper function to see which chips are selected when saving
function getSelectedCues() {
    const selected = Array.from(document.querySelectorAll('.chip.selected'))
        .map(chip => chip.getAttribute('data-value'));
    return selected.length > 0 ? selected.join(', ') : 'None';
}

// Logout Logic for the top header button
document.getElementById('header-logout-btn').addEventListener('click', async () => {
    const confirmLogout = confirm("Are you sure you want to log out?");
    if (confirmLogout) {
        const { error } = await db.auth.signOut();
        if (error) alert(error.message);
        else window.location.reload();
    }
});
