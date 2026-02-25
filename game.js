// --- 1. FIREBASE CONFIGURATION (Твои ключи) ---
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

// Инициализация Firebase (Классический метод для браузера)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();

// --- 2. СИСТЕМНЫЕ ПЕРЕМЕННЫЕ ---
// Определение устройства (ПК или Телефон)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// Скрываем надпись загрузки, если она есть
if(document.getElementById('device-info')) document.getElementById('device-info').style.display='none';

let currentUser = null;
let currentUsername = "Guest";
let gameActive = false;
let joystickManager = null;

// --- 3. АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        // Загружаем данные игрока
        db.ref('users/' + user.uid).once('value').then(snap => {
            currentUsername = snap.val()?.username || "Player";
            openDashboard();    // Открываем меню
            loadFriendRequests(); // Грузим заявки
            loadFriends();        // Грузим друзей
        });
    } else {
        // Показываем форму входа
        document.getElementById('auth-forms').style.display = 'block';
    }
});

function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert("Ошибка: " + err.message));
}

function register() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const n = document.getElementById('username').value;
    if(!n) return alert("Введите Никнейм!");
    
    auth.createUserWithEmailAndPassword(e, p).then(c => {
        // Сохраняем имя в базу
        db.ref('users/' + c.user.uid).set({ username: n, email: e, searchName: n.toLowerCase() });
    }).catch(err => alert("Ошибка: " + err.message));
}

function logout() { auth.signOut(); location.reload(); }


// --- 4. ГЛАВНОЕ МЕНЮ (DASHBOARD) ---
function openDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    
    document.getElementById('dash-username').innerText = currentUsername;
    document.getElementById('dash-avatar').innerText = currentUsername.charAt(0).toUpperCase();

    // Генерация списка игр
    const games = [
        { id: "city", title: "Blox City", color: "#44aa44", icon: "🏙️" },
        { id: "parkour", title: "Obby Parkour", color: "#aa4444", icon: "🔥" },
        { id: "space", title: "Moon Base", color: "#222244", icon: "🚀" }
    ];
    
    const list = document.getElementById('games-list');
    list.innerHTML = '';
    games.forEach(g => {
        list.innerHTML += `
        <div class="game-card" onclick="startGame('${g.id}')">
            <div class="game-icon" style="background:${g.color}">${g.icon}</div>
            <div><h4>${g.title}</h4></div>
            <button class="play-small">PLAY</button>
        </div>`;
    });
}

// Переключение вкладок (Игры / Друзья)
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    
    if(tabName === 'games') {
        document.getElementById('tab-games').style.display = 'block';
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
    } else {
        document.getElementById('tab-friends').style.display = 'block';
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
    }
}


// --- 5. СИСТЕМА ДРУЗЕЙ (CONNECTIONS) ---

// Поиск пользователей
function searchUsers() {
    const input = document.getElementById('search-input').value.toLowerCase();
    const resDiv = document.getElementById('search-results');
    resDiv.innerHTML = 'Searching...';
    
    if(input.length < 3) { resDiv.innerHTML = 'Enter at least 3 letters'; return; }

    db.ref('users').once('value').then(snap => {
        resDiv.innerHTML = '';
        let found = false;
        snap.forEach(child => {
            const u = child.val();
            const uid = child.key;
            // Ищем совпадение по имени (кроме себя)
            if (u.username.toLowerCase().includes(input) && uid !== currentUser.uid) {
                found = true;
                resDiv.innerHTML += `
                    <div class="user-card">
                        <div class="mini-avatar">${u.username[0]}</div>
                        <span>${u.username}</span>
                        <button class="btn-add" onclick="sendFriendRequest('${uid}')">Add</button>
                    </div>
                `;
            }
        });
        if(!found) resDiv.innerHTML = '<div style="color:#666; padding:10px;">User not found</div>';
    });
}

// Отправка заявки
function sendFriendRequest(targetUid) {
    db.ref(`friend_requests/${targetUid}/${currentUser.uid}`).set({
        username: currentUsername,
        status: 'pending'
    }).then(() => alert('Заявка отправлена!'));
}

// Загрузка входящих заявок
function loadFriendRequests() {
    db.ref(`friend_requests/${currentUser.uid}`).on('value', snap => {
        const list = document.getElementById('requests-list');
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div style="color:#666; font-size:12px;">No requests</div>'; return; }
        
        snap.forEach(child => {
            const req = child.val();
            const senderUid = child.key;
            list.innerHTML += `
                <div class="user-card">
                    <div class="mini-avatar">${req.username[0]}</div>
                    <span>${req.username}</span>
                    <div>
                        <button class="btn-accept" onclick="acceptFriend('${senderUid}', '${req.username}')">✓</button>
                        <button class="btn-decline" onclick="declineFriend('${senderUid}')">✕</button>
                    </div>
                </div>
            `;
        });
    });
}

// Принять заявку
function acceptFriend(senderUid, senderName) {
    // Взаимное добавление в друзья
    db.ref(`friends/${currentUser.uid}/${senderUid}`).set({ username: senderName });
    db.ref(`friends/${senderUid}/${currentUser.uid}`).set({ username: currentUsername });
    // Удаление заявки
    declineFriend(senderUid); 
}

// Отклонить заявку
function declineFriend(senderUid) {
    db.ref(`friend_requests/${currentUser.uid}/${senderUid}`).remove();
}

// Список друзей
function loadFriends() {
    db.ref(`friends/${currentUser.uid}`).on('value', snap => {
        const list = document.getElementById('friends-list');
        list.innerHTML = '';
        if(!snap.exists()) { list.innerHTML = '<div style="color:#666;">No friends yet</div>'; return; }
        
        snap.forEach(child => {
            const f = child.val();
            list.innerHTML += `
                <div class="user-card">
                    <div class="mini-avatar" style="background:#00b06f">${f.username[0]}</div>
                    <span>${f.username}</span>
                    <div style="font-size:10px; color:#00ff00;">● Online</div>
                </div>
            `;
        });
    });
}


// --- 6. ИГРОВОЙ ДВИЖОК (THREE.JS) ---

function exitGame() {
    gameActive = false;
    if (document.exitPointerLock) document.exitPointerLock();
    location.reload();
}

// Чат в игре
function initChat() {
    db.ref('games/global/chat').limitToLast(10).on('child_added', s => {
        const d = s.val();
        const b = document.getElementById('chat-messages');
        b.innerHTML += `<div class="chat-msg"><span class="chat-name">${d.user}:</span> ${d.text}</div>`;
        b.scrollTop = b.scrollHeight;
    });
}
function sendChat() {
    const i = document.getElementById('chat-input');
    if(i.value.trim()) db.ref('games/global/chat').push({user:currentUsername, text:i.value});
    i.value='';
}

// ЗАПУСК ИГРЫ
function startGame(mode) {
    gameActive = true;
    // Переключение интерфейса
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    
    if(isMobile) {
        document.getElementById('mobile-controls').style.display='block';
    } else {
        document.getElementById('mobile-controls').style.display='none';
        document.getElementById('pc-controls-hint').style.display='block';
        document.body.onclick = () => { if(gameActive) document.body.requestPointerLock(); };
    }
    
    initChat();

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Очистка старого канваса
    const cont = document.body;
    while(cont.querySelector('canvas')) cont.querySelector('canvas').remove();
    cont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.6));
    const dl = new THREE.DirectionalLight(0xffffff,0.8); dl.position.set(20,50,10); dl.castShadow=true; scene.add(dl);

    // Генерация Уровня
    let platforms = [];
    if(mode === 'city') {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x333333}));
        f.rotation.x = -Math.PI/2; f.receiveShadow=true; scene.add(f);
        for(let i=0;i<15;i++){
            const h=5+Math.random()*15;
            const b=new THREE.Mesh(new THREE.BoxGeometry(5,h,5), new THREE.MeshStandardMaterial({color:0x888888}));
            b.position.set((Math.random()-0.5)*80,h/2,(Math.random()-0.5)*80);
            b.castShadow=true; scene.add(b); platforms.push(b);
        }
    } else if (mode === 'parkour') {
        scene.background = new THREE.Color(0x220000);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshBasicMaterial({color:0xff0000}));
        l.rotation.x = -Math.PI/2; scene.add(l);
        const s = new THREE.Mesh(new THREE.BoxGeometry(5,1,5), new THREE.MeshStandardMaterial({color:0x555555}));
        s.position.y=0.5; scene.add(s); platforms.push(s);
        for(let i=1;i<20;i++){
            const p=new THREE.Mesh(new THREE.BoxGeometry(3,1,3), new THREE.MeshStandardMaterial({color:0x00ff00}));
            p.position.set((Math.random()-0.5)*10, 2+Math.random()*3, -i*6);
            scene.add(p); platforms.push(p);
        }
    } else {
        scene.background = new THREE.Color(0x000000);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x555555}));
        m.rotation.x = -Math.PI/2; scene.add(m);
    }

    // Персонаж (Roblox Style)
    const player = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xFFD700})); head.position.y=3.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), new THREE.MeshStandardMaterial({color:0x0000FF})); torso.position.y=2;
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), new THREE.MeshStandardMaterial({color:0x00FF00})); lLeg.position.y=-1;
    const lG = new THREE.Group(); lG.add(lLeg); lG.position.set(-0.5,1,0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), new THREE.MeshStandardMaterial({color:0x00FF00})); rLeg.position.y=-1;
    const rG = new THREE.Group(); rG.add(rLeg); rG.position.set(0.5,1,0);
    
    // Руки
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), new THREE.MeshStandardMaterial({color:0xFFD700})); lArm.position.y=-1;
    const lAG = new THREE.Group(); lAG.add(lArm); lAG.position.set(-1.5,3,0);
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), new THREE.MeshStandardMaterial({color:0xFFD700})); rArm.position.y=-1;
    const rAG = new THREE.Group(); rAG.add(rArm); rAG.position.set(1.5,3,0);

    player.add(head,torso,lG,rG, lAG, rAG);
    player.userData={lg:lG, rg:rG, la:lAG, ra:rAG};
    scene.add(player); camera.position.set(0,5,-10);

    // Управление
    let moveFwd=0, moveTurn=0, vy=0, pcKeys={w:0,a:0,s:0,d:0};

    if(isMobile) {
        const z = document.getElementById('joystick-zone'); z.innerHTML='';
        joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white'});
        joystickManager.on('move', (e,d) => {
            moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.15;
            moveTurn = Math.cos(d.angle.radian)*0.08;
        });
        joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
        document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); 