// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
  // ВСТАВЬ СЮДА СВОИ КЛЮЧИ (apiKey и т.д.)
  apiKey: "AIzaSy...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// --- 2. УПРАВЛЕНИЕ АВТОРИЗАЦИЕЙ ---
let isRegistering = false;
const modal = document.getElementById('auth-modal');

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('auth-btn-group').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        // Получаем имя из базы
        db.ref('users/' + user.uid).once('value').then(snap => {
            const name = snap.val()?.username || "Player";
            document.getElementById('nav-username').innerText = name;
            document.getElementById('nav-avatar').innerText = name[0];
        });
        modal.style.display = "none";
    } else {
        document.getElementById('auth-btn-group').style.display = 'block';
        document.getElementById('user-profile').style.display = 'none';
    }
});

function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const name = document.getElementById('username').value;
    const msg = document.getElementById('error-msg');

    if (isRegistering) {
        if(!name) { msg.innerText = "Need username"; return; }
        auth.createUserWithEmailAndPassword(email, pass)
            .then(cred => {
                db.ref('users/' + cred.user.uid).set({ username: name, email: email });
            })
            .catch(e => msg.innerText = e.message);
    } else {
        auth.signInWithEmailAndPassword(email, pass)
            .catch(e => msg.innerText = "Login failed");
    }
}

function logout() { auth.signOut(); }

// --- 3. ГЕНЕРАЦИЯ ИГР И ЗАПУСК ПРИЛОЖЕНИЯ ---
const games = [
    { id: "city", title: "Blox City RP", online: "1.2k", color: "#44aa44", icon: "🏙️" },
    { id: "obby", title: "Mega Obby", online: "500", color: "#aa4444", icon: "🏃" },
    { id: "survival", title: "Zombie Survival", online: "800", color: "#4444aa", icon: "🧟" },
    { id: "tycoon", title: "Pizza Tycoon", online: "3.5k", color: "#aaaa44", icon: "🍕" }
];

const grid = document.getElementById('games-grid');

games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
        <div class="game-thumb" style="background:${game.color}">${game.icon}</div>
        <div class="game-info">
            <div class="game-title">${game.title}</div>
            <div class="game-stats">👥 ${game.online} Playing</div>
            <!-- ССЫЛКА НА ЗАПУСК ПРИЛОЖЕНИЯ -->
            <a href="pocketblox://play?id=${game.id}" class="play-btn" onclick="tryLaunchApp(event)">▶ PLAY</a>
        </div>
    `;
    grid.appendChild(card);
});

// --- ЛОГИКА DEEP LINKING ---
function tryLaunchApp(e) {
    // Эта функция сработает при нажатии PLAY
    // Ссылка href="pocketblox://..." попытается открыть приложение
    
    // Если игрок на ПК или приложения нет, можно показать сообщение:
    setTimeout(function() {
        if(confirm("App not installed or didn't open? Download APK?")) {
            window.location.href = "download-apk.html"; // Ссылка на скачивание (нужно создать)
        }
    }, 2500);
}

// UI Функции
function openModal(mode) {
    modal.style.display = "block";
    isRegistering = (mode === 'register');
    document.getElementById('username').style.display = isRegistering ? 'block' : 'none';
    document.getElementById('modal-title').innerText = isRegistering ? 'Sign Up' : 'Log In';
    document.getElementById('auth-action-btn').innerText = isRegistering ? 'Sign Up' : 'Log In';
    document.getElementById('switch-text').innerText = isRegistering ? 'Have account? Log In' : 'No account? Sign Up';
}
function closeModal() { modal.style.display = "none"; }
function toggleAuthMode() { openModal(isRegistering ? 'login' : 'register'); }
window.onclick = function(e) { if(e.target == modal) closeModal(); }