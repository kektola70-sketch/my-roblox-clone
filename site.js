// --- 1. FIREBASE CONFIGURATION ---
// Твои настройки (адаптированные для работы в браузере)
const firebaseConfig = {
  apiKey: "AIzaSyB_1fSgljQJV73dVAt1H-Atvr4j1MGJDiA",
  authDomain: "pocketblox-e1290.firebaseapp.com",
  databaseURL: "https://pocketblox-e1290-default-rtdb.firebaseio.com",
  projectId: "pocketblox-e1290",
  storageBucket: "pocketblox-e1290.firebasestorage.app",
  messagingSenderId: "611510454197",
  appId: "1:611510454197:web:7c1b2ee43060ea44863bfc",
  measurementId: "G-YF198J4W61"
};

// Инициализация Firebase (проверка, чтобы не запускать дважды)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Получаем доступ к функциям
const auth = firebase.auth();
const db = firebase.database();

// --- 2. УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЕМ (СЕРВЕРНАЯ ЧАСТЬ) ---

// Переменные интерфейса
const authModal = document.getElementById('auth-modal');
const navProfile = document.getElementById('user-profile');
const navButtons = document.getElementById('auth-btn-group');
let isRegistering = false; // Режим: вход или регистрация

// Слушаем изменения статуса (Вошел или Вышел)
auth.onAuthStateChanged((user) => {
    if (user) {
        // ЕСЛИ ВОШЕЛ:
        console.log("User logged in:", user.email);
        navButtons.style.display = 'none'; // Скрыть кнопки входа
        navProfile.style.display = 'flex'; // Показать профиль
        authModal.style.display = "none";  // Закрыть окно

        // Загружаем Никнейм из Базы Данных
        db.ref('users/' + user.uid).once('value').then((snapshot) => {
            const data = snapshot.val();
            const username = data && data.username ? data.username : "Player";
            
            // Обновляем шапку сайта
            document.getElementById('nav-username').innerText = username;
            document.getElementById('nav-avatar').innerText = username.charAt(0).toUpperCase();
        });

    } else {
        // ЕСЛИ ВЫШЕЛ:
        console.log("User logged out");
        navButtons.style.display = 'block'; // Показать кнопки входа
        navProfile.style.display = 'none';  // Скрыть профиль
    }
});

// Функция Входа / Регистрации
function handleAuth() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    const msg = document.getElementById('error-msg');

    if (!email || !pass) {
        msg.innerText = "Please enter email and password";
        msg.style.color = "red";
        return;
    }

    if (isRegistering) {
        // --- РЕГИСТРАЦИЯ ---
        if (!username) { msg.innerText = "Please enter username"; return; }
        
        msg.innerText = "Creating account...";
        auth.createUserWithEmailAndPassword(email, pass)
            .then((userCredential) => {
                // Сохраняем имя пользователя в базу
                const user = userCredential.user;
                db.ref('users/' + user.uid).set({
                    username: username,
                    email: email,
                    joined: new Date().toISOString()
                });
                msg.innerText = "Success!";
                msg.style.color = "green";
            })
            .catch((error) => {
                msg.innerText = error.message;
                msg.style.color = "red";
            });

    } else {
        // --- ВХОД ---
        msg.innerText = "Logging in...";
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                msg.innerText = "Success!";
                msg.style.color = "green";
            })
            .catch((error) => {
                msg.innerText = "Error: " + error.message;
                msg.style.color = "red";
            });
    }
}

// Функция Выхода
function logout() {
    auth.signOut();
    location.reload(); // Перезагрузить страницу
}


// --- 3. ГЕНЕРАЦИЯ ИГР И ЗАПУСК (LAUNCHER) ---

// Список "Плейсов" на сервере
const gamesData = [
    { id: "city_rp", title: "Blox City RP", online: "1.2k", color: "#44aa44", icon: "🏙️" },
    { id: "obby_mega", title: "Mega Obby Parkour", online: "524", color: "#aa4444", icon: "🏃" },
    { id: "tycoon_pizza", title: "Pizza Tycoon", online: "3.5k", color: "#4444aa", icon: "🍕" },
    { id: "zombie_survival", title: "Zombie Survival", online: "890", color: "#aaaa44", icon: "🧟" },
    { id: "speed_run", title: "Speed Run 4", online: "200", color: "#aa44aa", icon: "⚡" }
];

const gamesGrid = document.getElementById('games-grid');

// Отрисовка карточек
if (gamesGrid) {
    gamesData.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-thumb" style="background:${game.color}">${game.icon}</div>
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-stats">
                    <span>👥 ${game.online} Playing</span>
                </div>
                <!-- Кнопка запуска -->
                <button class="play-btn" onclick="launchGame('${game.id}', '${game.title}')">
                    <i class="fas fa-play"></i> PLAY
                </button>
            </div>
        `;
        gamesGrid.appendChild(card);
    });
}

// --- ЛОГИКА ЗАПУСКА ПРИЛОЖЕНИЯ (DEEP LINKING) ---
// --- ИСПРАВЛЕННАЯ ЛОГИКА ЗАПУСКА (WEB VERSION) ---
function launchGame(gameId, gameTitle) {
    const user = auth.currentUser;
    
    // 1. Проверка входа
    if (!user) {
        alert("Сначала войдите в аккаунт!");
        openModal('login');
        return;
    }

    console.log(`Запуск игры: ${gameTitle}`);
    
    // 2. Вместо 'pocketblox://' мы просто открываем файл с игрой
    // Мы передаем ID игры в адресе, чтобы игра знала, что грузить
    const gameUrl = `game.html?id=${gameId}&user=${user.uid}`;
    
    // Переходим на страницу игры
    window.location.href = gameUrl;
}
    
    // 1. Попытка открыть установленное APK приложение
    // Ссылка формата: pocketblox://play?gameId=...&user=...
    const deepLink = `pocketblox://play?id=${gameId}&user=${user.uid}`;
    
    // Создаем невидимую ссылку и кликаем по ней
    const a = document.createElement('a');
    a.href = deepLink;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    
    // 2. Если приложение не открылось через 2 секунды (например, мы на ПК или нет APK)
    // Предлагаем скачать или открыть веб-версию
    setTimeout(() => {
        const confirmWeb = confirm(`App didn't open. Do you want to play "${gameTitle}" in Browser instead?`);
        if (confirmWeb) {
            // Если у тебя есть файл game.html из прошлых шагов
            // Мы передаем параметры через URL
            window.location.href = `game.html?id=${gameId}`; 
        }
    }, 2000);
}


// --- 4. УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ---

function openModal(mode) {
    authModal.style.display = "block";
    isRegistering = (mode === 'register');
    toggleUI();
}

function closeModal() {
    authModal.style.display = "none";
}

function toggleAuthMode() {
    isRegistering = !isRegistering;
    toggleUI();
}

function toggleUI() {
    const title = document.getElementById('modal-title');
    const btn = document.getElementById('auth-action-btn');
    const switchText = document.getElementById('switch-text');
    const usernameInput = document.getElementById('username');
    const errorMsg = document.getElementById('error-msg');

    errorMsg.innerText = ""; // Очистить ошибки

    if (isRegistering) {
        title.innerText = "Sign Up";
        btn.innerText = "Create Account";
        switchText.innerText = "Already have an account? Log In";
        usernameInput.style.display = "block";
    } else {
        title.innerText = "Log In";
        btn.innerText = "Log In";
        switchText.innerText = "No account? Sign Up";
        usernameInput.style.display = "none";
    }
}

// Закрытие по клику вне окна
window.onclick = function(event) {
    if (event.target == authModal) {
        closeModal();
    }
}