// --- КОНФИГУРАЦИЯ ---
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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ОПРЕДЕЛЕНИЕ УСТРОЙСТВА (АВТОМАТИЧЕСКИ)
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
document.getElementById('device-info').innerText = isMobile ? "Mobile Version Detected" : "PC Version Detected";

let currentUser = null;
let currentUsername = "Guest";
let gameActive = false;
let joystickManager = null;

// --- АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('device-info').style.display = 'none';
        db.ref('users/' + user.uid).once('value').then(snap => {
            currentUsername = snap.val()?.username || "Player";
            openDashboard();
        });
    } else {
        document.getElementById('device-info').style.display = 'none';
        document.getElementById('auth-forms').style.display = 'block';
    }
});

function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert(err.message));
}
function register() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const n = document.getElementById('username').value;
    if(!n) return alert("Nickname required");
    auth.createUserWithEmailAndPassword(e, p).then(c => {
        db.ref('users/' + c.user.uid).set({ username: n, email: e });
    }).catch(err => alert(err.message));
}
function logout() { auth.signOut(); location.reload(); }

// --- МЕНЮ ---
function openDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('dash-username').innerText = currentUsername;
    document.getElementById('dash-avatar').innerText = currentUsername[0];

    const games = [
        { id: "city", title: "Blox City", color: "#44aa44", icon: "🏙️" },
        { id: "parkour", title: "Obby Parkour", color: "#aa4444", icon: "🔥" }
    ];
    const list = document.getElementById('games-list');
    list.innerHTML = '';
    games.forEach(g => {
        list.innerHTML += `<div class="game-card" onclick="startGame('${g.id}')">
            <div class="game-icon" style="background:${g.color}">${g.icon}</div>
            <div><h4>${g.title}</h4></div>
        </div>`;
    });
}

function exitGame() {
    gameActive = false;
    // Снимаем захват мыши для ПК
    if (document.exitPointerLock) document.exitPointerLock();
    location.reload();
}

// --- ЧАТ СИСТЕМА ---
function initChat(gameId) {
    const chatRef = db.ref('games/' + gameId + '/chat');
    const msgBox = document.getElementById('chat-messages');
    msgBox.innerHTML = ''; // Очистить старый чат

    // Слушаем новые сообщения
    chatRef.limitToLast(10).on('child_added', snap => {
        const data = snap.val();
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="chat-name">${data.user}:</span> ${data.text}`;
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    });
}

function sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value;
    if (text.trim() === "") return;
    
    // Отправка в базу данных (В текущую игру 'global' или ID игры)
    db.ref('games/global/chat').push({
        user: currentUsername,
        text: text
    });
    input.value = "";
}

// --- ИГРА ---
function startGame(mode) {
    gameActive = true;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    
    // Настройка интерфейса под устройство
    if (!isMobile) {
        document.getElementById('mobile-controls').style.display = 'none';
        document.getElementById('pc-controls-hint').style.display = 'block';
        // Захват мыши при клике
        document.body.onclick = () => {
            if(gameActive) document.body.requestPointerLock();
        };
    } else {
        document.getElementById('mobile-controls').style.display = 'block';
        document.getElementById('pc-controls-hint').style.display = 'none';
    }

    initChat('global'); // Включаем чат

    // Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(20,50,10); dl.castShadow=true; scene.add(dl);

    // Уровень
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x333333}));
    floor.rotation.x = -Math.PI/2; floor.receiveShadow=true; scene.add(floor);
    
    for(let i=0; i<15; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(4,4+Math.random()*10,4), new THREE.MeshStandardMaterial({color:0x888888}));
        b.position.set((Math.random()-0.5)*80, 2, (Math.random()-0.5)*80);
        scene.add(b);
    }

    // Персонаж
    function createNoob() {
        const grp = new THREE.Group();
        const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xFFD700})); head.position.y=3.5;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), new THREE.MeshStandardMaterial({color:0x0000FF})); torso.position.y=2;
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.8,2,0.8), new THREE.MeshStandardMaterial({color:0x00FF00})); lLeg.position.y=-1;
        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.8,2,0.8), new THREE.MeshStandardMaterial({color:0x00FF00})); rLeg.position.y=-1;
        
        const lG = new THREE.Group(); lG.add(lLeg); lG.position.set(-0.5,1,0);
        const rG = new THREE.Group(); rG.add(rLeg); rG.position.set(0.5,1,0);
        
        grp.add(head, torso, lG, rG);
        