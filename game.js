// 1. КОНФИГУРАЦИЯ FIREBASE (ВСТАВЬ СВОИ ДАННЫЕ!)
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

// Глобальные переменные
let currentUser = null;
let joystickManager = null; // Для управления джойстиком

// --- ЧАСТЬ 1: АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('loading').style.display = 'none';
        
        db.ref('users/' + user.uid).once('value').then(snap => {
            const name = snap.val()?.username || "Player";
            openDashboard(name);
        });
    } else {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('auth-forms').style.display = 'block';
    }
});

function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
}

function register() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const name = document.getElementById('username').value;
    if(!name) return alert("Введите имя!");
    
    auth.createUserWithEmailAndPassword(email, pass).then(cred => {
        db.ref('users/' + cred.user.uid).set({ username: name, email: email, score: 0 });
    }).catch(e => alert(e.message));
}

function logout() { auth.signOut(); location.reload(); }


// --- ЧАСТЬ 2: МЕНЮ (DASHBOARD) ---
function openDashboard(username) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('game-ui').style.display = 'none';

    // Заполняем профиль
    document.getElementById('dash-username').innerText = username;
    document.getElementById('dash-avatar').innerText = username[0];

    // Генерируем Лидерборд (Фейковый + Настоящий игрок)
    const lbList = document.getElementById('leaderboard');
    lbList.innerHTML = `
        <div class="lb-item"><span class="lb-rank">#1</span><span>Admin_God</span><span>9999 pts</span></div>
        <div class="lb-item"><span class="lb-rank">#2</span><span>ProGamer</span><span>5400 pts</span></div>
        <div class="lb-item"><span class="lb-rank">#3</span><span>NoobKiller</span><span>3200 pts</span></div>
        <div class="lb-item" style="background:#333"><span class="lb-rank">#You</span><span>${username}</span><span>0 pts</span></div>
    `;

    // Генерируем Игры
    const games = [
        { id: "city", title: "Blox City RP", icon: "🏙️", color: "#44aa44" },
        { id: "parkour", title: "Mega Parkour", icon: "🏃", color: "#aa4444" },
        { id: "space", title: "Space Wars", icon: "🚀", color: "#4444aa" }
    ];
    
    const gList = document.getElementById('games-list');
    gList.innerHTML = '';
    games.forEach(g => {
        gList.innerHTML += `
            <div class="game-card" onclick="startGame('${g.color}')">
                <div class="game-icon" style="background:${g.color}">${g.icon}</div>
                <div class="game-details">
                    <h4>${g.title}</h4>
                    <p>Tap to play</p>
                </div>
                <button class="play-small">PLAY</button>
            </div>
        `;
    });
}

function exitGame() {
    // Удаляем джойстик при выходе
    if(joystickManager) { joystickManager.destroy(); joystickManager = null; }
    // Перезагружаем страницу для возврата в меню (самый простой способ очистить Three.js)
    location.reload(); 
}

// --- ЧАСТЬ 3: ИГРА (THREE.JS + ДЖОЙСТИК) ---
function startGame(worldColor) {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    // 1. Инициализация Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Удаляем старый канвас если есть
    const oldCanvas = document.querySelector('canvas');
    if(oldCanvas) oldCanvas.remove();
    document.body.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: worldColor }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Блоки
    for(let i=0; i<15; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(4,4,4), new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
        mesh.position.set((Math.random()-0.5)*60, 2, (Math.random()-0.5)*60);
        mesh.castShadow = true;
        scene.add(mesh);
    }

    // Игрок
    const player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), new THREE.MeshStandardMaterial({color: 0x0088ff}));
    body.position.y = 2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0xffd700}));
    head.position.y = 3.6;
    player.add(body, head);
    scene.add(player);

    camera.position.set(0, 7, -10);

    // --- НАСТРОЙКА ДЖОЙСТИКА (NIPPLE.JS) ---
    const joyZone = document.getElementById('joystick-zone');
    joystickManager = nipplejs.create({
        zone: joyZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 100
    });

    let moveData = { forward: 0, turn: 0 };

    joystickManager.on('move', (evt, data) => {
        // Конвертируем данные джойстика
        // data.force - сила нажатия (скорость)
        // data.angle.radian - угол поворота
        
        const force = Math.min(data.force, 2); // Ограничим скорость
        const angle = data.angle.radian;

        // Вычисляем движение (простая математика)
        // В Three.js Z - это вперед/назад, X - влево/вправо
        moveData.forward = Math.sin(angle) * force * 0.1;
        moveData.turn = Math.cos(angle) * 0.05; 
    });

    joystickManager.on('end', () => {
        moveData.forward = 0;
        moveData.turn = 0;
    });

    // Прыжок
    let vy = 0;
    const btnJump = document.getElementById('btnJump');
    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault(); if(player.position.y <= 0.1) vy = 0.3;
    });

    // Анимация
    function animate() {
        if(!document.getElementById('game-ui').style.display === 'none') return; // Остановить если вышли
        requestAnimationFrame(animate);

        // Физика
        if(player.position.y > 0 || vy > 0) {
            player.position.y += vy;
            vy -= 0.015;
        } else {
            player.position.y = 0;
            vy = 0;
        }

        // Управление Джойстиком
        if(moveData.forward !== 0) {
            player.translateZ(moveData.forward); // Движение вперед по направлению взгляда
            player.rotation.y -= moveData.turn;  // Поворот
        }

        // Камера следует за игроком
        const camOffset = new THREE.Vector3(0, 6, -10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(camOffset, 0.1);
        camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

        renderer.render(scene, camera);
    }
    
    // Ресайз
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}