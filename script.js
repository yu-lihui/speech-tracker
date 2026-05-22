// Initialize Supabase correctly for browser use
const { createClient } = supabase; // This grabs the tool from the script tag
const supabaseUrl = 'https://meypivmccykkqtazcrma.supabase.co';
const supabaseKey = 'sb_publishable_AkQZZKS2b5Ejbo5L5wL38Q_K2AL_JIW';

const db = createClient(supabaseUrl, supabaseKey);

// --- NEW: AUTHENTICATION LOGIC ---
async function checkUser() {
    const { data: { user } } = await db.auth.getUser();
    const mainApp = document.querySelector('.container'); // Your tracker box
    const header = document.getElementById('account-header');
    const authOverlay = document.getElementById('auth-overlay');

    if (user) {
        // USER LOGGED IN
        authOverlay.classList.add('hidden');
        mainApp.style.display = 'block'; // Show tracker
        if (header) header.style.display = 'flex';
        document.getElementById('user-display-email').textContent = user.email;
        loadHistory();
    } else {
        // USER LOGGED OUT
        authOverlay.classList.remove('hidden');
        mainApp.style.display = 'none';  // LITERALLY remove the tracker from the page
        if (header) header.style.display = 'none';
    }
}

function showResetPasswordUI() {
    document.getElementById('login-password-wrapper').classList.add('hidden');
    
    // Hide login elements
    document.getElementById('auth-email').classList.add('hidden');
    document.getElementById('auth-password').classList.add('hidden');
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('google-login-btn').classList.add('hidden');
    document.querySelector('.auth-divider').classList.add('hidden');
    document.querySelector('.signup-text').classList.add('hidden');
    document.getElementById('forgot-password-link').classList.add('hidden');
    document.getElementById('signup-view').classList.add('hidden');
    
    // Show reset section
    document.querySelector('.logo-container').classList.remove('hidden');
    document.getElementById('reset-password-section').classList.remove('hidden');
    document.getElementById('auth-overlay').classList.remove('hidden');
}

// Handle Sign Up Click
document.getElementById('signup-btn').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

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
        document.getElementById('auth-overlay').classList.add('hidden');
        document.querySelector('.container').style.display = 'block';
        document.getElementById('account-header').style.display = 'flex';

        window.scrollTo(0, 0);
        
        const { data: { user } } = await db.auth.getUser();
        document.getElementById('user-display-email').textContent = user.email;
        loadHistory();
    }
});

document.getElementById('signup-toggle').addEventListener('click', () => {
    document.getElementById('login-password-wrapper').classList.add('hidden');
    
    document.getElementById('signup-view').classList.remove('hidden');
    document.getElementById('auth-email').classList.add('hidden');
    document.getElementById('auth-password').classList.add('hidden');
    document.getElementById('login-btn').classList.add('hidden');
    document.getElementById('forgot-password-link').classList.add('hidden');
    document.querySelector('.signup-text').classList.add('hidden');
    document.querySelector('.auth-divider').classList.add('hidden');
    document.getElementById('google-login-btn').classList.add('hidden');
});

document.getElementById('go-to-login').addEventListener('click', () => {
    document.getElementById('signup-view').classList.add('hidden');
    document.getElementById('login-password-wrapper').classList.remove('hidden');
    document.getElementById('auth-email').classList.remove('hidden');
    document.getElementById('auth-password').classList.remove('hidden');
    document.getElementById('login-btn').classList.remove('hidden');
    document.getElementById('forgot-password-link').classList.remove('hidden');
    document.querySelector('.signup-text').classList.remove('hidden');
    document.querySelector('.auth-divider').classList.remove('hidden');
    document.getElementById('google-login-btn').classList.remove('hidden');
});

// Detect recovery links BEFORE checkUser runs
const urlParams = new URLSearchParams(window.location.search);
const recoveryCode = urlParams.get('code');
const isRecoveryUrl = recoveryCode !== null || window.location.hash.includes('type=recovery');

if (isRecoveryUrl) {
    sessionStorage.setItem('is_recovery', 'true');
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Run auth check + recovery in sequence
(async () => {
    // Step 1: Normal auth check (shows tracker if logged in via Google, etc.)
    await checkUser();
    
    // Step 2: Handle password recovery ONLY if not already logged in
    if (sessionStorage.getItem('is_recovery') === 'true') {
        sessionStorage.removeItem('is_recovery');
        
        // Check if user is already logged in (Google OAuth, etc.)
        const { data: { user } } = await db.auth.getUser();
        
        if (!user && recoveryCode) {
            // PKCE flow: exchange code and set session
            const { data, error } = await db.auth.exchangeCodeForSession(recoveryCode);
            
            if (error) {
                alert("This reset link is invalid or has expired.");
                return;
            }
            
            // Explicitly persist session
            if (data?.session) {
                await db.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
            }
            
            // Show reset UI
            const authOverlay = document.getElementById('auth-overlay');
            const mainApp = document.querySelector('.container');
            const header = document.getElementById('account-header');
            
            authOverlay.classList.remove('hidden');
            mainApp.style.display = 'none';
            if (header) header.style.display = 'none';
            
            showResetPasswordUI();
        }
    }
    
    // Older implicit flow (hash-based)
    if (window.location.hash.includes('type=recovery')) {
        const { data: { user } } = await db.auth.getUser();
        if (!user) {
            showResetPasswordUI();
        }
    }
})();

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
        .eq('user_id', user.id)
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function redrawPills() {
    historyLog.innerHTML = "";
    allSessions.forEach((session) => {
        const pill = document.createElement('div');
        pill.classList.add('history-pill');

        const dateObj = new Date(session.created_at);
        const displayDate = session.created_at
            ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : 'No date';

        pill.innerHTML = `
            <div class="pill-content">
                <div class="pill-info">
                    <strong class="pill-client">${escapeHtml(session.client_name)}</strong>: 
                    <strong class="pill-sound">${escapeHtml(session.sound)}</strong>
                    
                    <div class="pill-details">
                        <span>${escapeHtml(session.level)}</span> | Cues: <span>${escapeHtml(session.prompt)}</span>
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
    const clientData = allSessions.filter(h => 
        (h.client_name || '').toLowerCase() === (clientName || '').toLowerCase()
    );

    container.innerHTML = '';
    if (clientData.length === 0) {
        messageArea.innerHTML = `<p style="text-align:center; color:#95a5a6;">No sessions found for "${escapeHtml(clientName)}".</p>`;
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

        let rows = groups[sound]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(entry => `
                <tr class="goal-row">
                    <td class="cell-level">${escapeHtml(entry.level)}</td>
                    <td class="cell-cues">${escapeHtml(entry.prompt || 'Indpt')}</td>
                    <td class="cell-acc" style="color:${entry.accuracy >= 80 ? '#2a9d8f' : '#e76f51'}">
                        ${entry.accuracy}%
                    </td>
                    <td class="cell-date">${entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : 'No date'}</td>
                </tr>
            `).join('');

        card.innerHTML = `
            <div class="goal-header">${escapeHtml(sound)}</div>
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
    if (e.target.classList.contains('chip')) {
        e.target.classList.toggle('selected');
        
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

// NEW: Google Login
document.getElementById('google-login-btn').addEventListener('click', async () => {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) alert("Google Login Error: " + error.message);
});

document.getElementById('forgot-password-link').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value;
    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) alert("Error: " + error.message);
    else alert("Check your email!");
});

document.getElementById('update-password-btn').addEventListener('click', async () => {
    const newPassword = document.getElementById('new-password').value;
    
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }
    
    // Verify session exists before updating
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
        alert("Session expired. Please request a new reset link.");
        return;
    }
    
    const { error } = await db.auth.updateUser({ password: newPassword });
    
    if (error) {
        alert("Failed to update password: " + error.message);
    } else {
        alert("Password updated! Please log in with your new password.");
        await db.auth.signOut();
        window.location.href = window.location.origin;
    }
});

// Password visibility toggle
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const inputId = btn.getAttribute('data-target');
        const input = document.getElementById(inputId);
        
        if (input.type === 'password') {
            input.type = 'text';
            btn.textContent = '👁';
        } else {
            input.type = 'password';
            btn.textContent = '🙈';
        }
    });
});
