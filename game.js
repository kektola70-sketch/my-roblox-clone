// --- ЛОВЕЦ ОШИБОК (Покажет Alert, если что-то сломалось) ---
window.onerror = function(msg, url, line) {
   // Раскомментируй строку ниже, если хочешь видеть ошибки на экране
   // alert("Error: " + msg + "\nLine: " + line);
};

// --- КОНФИГ (ВСТАВЬ СВОИ ДАННЫЕ) ---
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

// Инициализация
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Проверка устройства
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// Безопасное скрытие надписи загрузки
const devInfo = document.getElementById('device-info');
if(devInfo) devInfo.innerText = isMobile ? "Mobile Mode" : "PC Mode";

let currentUser = null;
let currentUsername = "Guest";
let gameActive = false;
let joystickManager = null;

// --- АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        if(devInfo) devInfo.style.display = 'none'; // Скрываем загрузку
        
        db.ref('users/' + user.uid).once('value').then(snap => {
            currentUsername = snap.val()?.username || "Player";
            openDashboard();
            loadFriendsLogic(); // Загрузка друзей
        }).catch(err => {
            alert("Ошибка базы данных: " + err.message);
        });
    } else {
        if(devInfo) devInfo.style.display = 'none';
        const forms = document.getElementById('auth-forms');
        if(forms) forms.style.display = 'block';
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
        db.ref('users/' + c.user.uid).set({ username: n, email: e, searchName: n.toLowerCase() });
    }).catch(err => alert(err.message));
}
function logout() { auth.signOut(); location.reload(); }

// --- МЕНЮ ---
function openDashboard() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('dash-username').innerText = currentUsername;
    document.getElementById('dash-avatar').innerText = currentUsername[0];

    const games = [
        { id: "city", title: "Blox City", color: "#44aa44", icon: "🏙️" },
        { id: "parkour", title: "Obby Parkour", color: "#aa4444", icon: "🔥" }
    ];
    const list = document.getElementById('games-list');
    if(list) {
        list.innerHTML = '';
        games.forEach(g => {
            list.innerHTML += `<div class="game-card" onclick="startGame('${g.id}')">
                <div class="game-icon" style="background:${g.color}">${g.icon}</div>
                <div><h4>${g.title}</h4></div>
            </div>`;
        });
    }
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none');
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    if(t==='games') {
        document.getElementById('tab-games').style.display='block';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else {
        document.getElementById('tab-friends').style.display='block';
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    }
}

// --- ДРУЗЬЯ ---
function loadFriendsLogic() {
    // Входящие заявки
    db.ref(`friend_requests/${currentUser.uid}`).on('value', snap => {
        const list = document.getElementById('requests-list');
        if(list) {
            list.innerHTML = '';
            snap.forEach(c => {
                const req = c.val();
                list.innerHTML += `<div class="user-card">
                    <span>${req.username}</span>
                    <button class="btn-accept" onclick="acceptF('${c.key}','${req.username}')">✓</button>
                </div>`;
            });
        }
    });

    // Список друзей
    db.ref(`friends/${currentUser.uid}`).on('value', snap => {
        const list = document.getElementById('friends-list');
        if(list) {
            list.innerHTML = '';
            snap.forEach(c => {
                list.innerHTML += `<div class="user-card"><span>${c.val().username}</span></div>`;
            });
        }
    });
}

function searchUsers() {
    const val = document.getElementById('search-input').value.toLowerCase();
    const res = document.getElementById('search-results');
    res.innerHTML = 'Searching...';
    db.ref('users').once('value').then(snap => {
        res.innerHTML = '';
        snap.forEach(c => {
            const u = c.val();
            if(u.username.toLowerCase().includes(val) && c.key !== currentUser.uid) {
                res.innerHTML += `<div class="user-card">
                    <span>${u.username}</span>
                    <button class="btn-add" onclick="sendReq('${c.key}')">Add</button>
                </div>`;
            }
        });
        if(res.innerHTML === '') res.innerHTML = 'Not found';
    });
}

function sendReq(uid) {
    db.ref(`friend_requests/${uid}/${currentUser.uid}`).set({username: currentUsername, status:'pending'});
    alert('Sent!');
}
function acceptF(uid, name) {
    db.ref(`friends/${currentUser.uid}/${uid}`).set({username: name});
    db.ref(`friends/${uid}/${currentUser.uid}`).set({username: currentUsername});
    db.ref(`friend_requests/${currentUser.uid}/${uid}`).remove();
}


// --- ИГРА ---
function exitGame() { location.reload(); }

function initChat() {
    db.ref('games/global/chat').limitToLast(8).on('child_added', s => {
        const d = s.val();
        const b = document.getElementById('chat-messages');
        if(b) {
            b.innerHTML += `<div class="chat-msg"><span class="chat-name">${d.user}:</span> ${d.text}</div>`;
            b.scrollTop = b.scrollHeight;
        }
    });
}
function sendChat() {
    const i = document.getElementById('chat-input');
    if(i.value.trim()) db.ref('games/global/chat').push({user:currentUsername, text:i.value});
    i.value='';
}

function startGame(mode) {
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    gameActive = true;

    if(isMobile) {
        document.getElementById('mobile-controls').style.display='block';
    } else {
        document.getElementById('mobile-controls').style.display='none';
        document.getElementById('pc-controls-hint').style.display='block';
        document.body.onclick = () => { if(gameActive) document.body.requestPointerLock(); };
    }

    initChat();

    // Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    const cont = document.body;
    while(cont.querySelector('canvas')) cont.querySelector('canvas').remove();
    cont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.6));
    const dl = new THREE.DirectionalLight(0xffffff,0.8); dl.position.set(10,50,10); scene.add(dl);

    // Уровень
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x333333}));
    floor.rotation.x = -Math.PI/2; scene.add(floor);
    
    // Игрок
    const player = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xFFD700})); head.position.y=3.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), new THREE.MeshStandardMaterial({color:0x0000FF})); torso.position.y=2;
    player.add(head, torso);
    scene.add(player); camera.position.set(0,5,-10);

    // Управление
    let moveFwd=0, moveTurn=0;
    if(isMobile) {
        const z = document.getElementById('joystick-zone'); z.innerHTML='';
        joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white'});
        joystickManager.on('move', (e,d) => {
            moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.15;
            moveTurn = Math.cos(d.angle.radian)*0.08;
        });
        joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);
        if(moveFwd!==0) {
            player.translateZ(moveFwd);
            if(isMobile) player.rotation.y -= moveTurn;
        }
        const o = new THREE.Vector3(0,5,-8).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+2, player.position.z);
        renderer.render(scene, camera);
    }
    animate();
}