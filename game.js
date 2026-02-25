// --- 0. МОМЕНТАЛЬНАЯ ПРОВЕРКА УСТРОЙСТВА ---
// Делаем это самой первой строчкой, чтобы не ждать ничего
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log("Device:", isMobile ? "Mobile" : "PC");

// --- 1. FIREBASE CONFIG (ТВОИ КЛЮЧИ) ---
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

// Инициализация (только если еще не запущено)
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Глобальные переменные
let currentUser = null;
let currentUsername = "Guest";
let gameActive = false;
let joystickManager = null;

// Ссылки на элементы (кэшируем для скорости)
const elAuthScreen = document.getElementById('auth-screen');
const elDashboard = document.getElementById('dashboard');
const elGameUI = document.getElementById('game-ui');
const elAuthForms = document.getElementById('auth-forms');
const elDeviceInfo = document.getElementById('device-info');

// Убираем текст "Анализ...", если он есть, сразу показываем формы или грузимся
if(elDeviceInfo) elDeviceInfo.style.display = 'none';

// --- 2. БЫСТРАЯ АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        // Игрок найден - сразу грузим меню, не показываем формы
        currentUser = user;
        // Запускаем получение имени параллельно
        db.ref('users/' + user.uid).once('value').then(snap => {
            currentUsername = snap.val()?.username || "Player";
            openDashboard(); // Открываем меню
        });
    } else {
        // Игрока нет - мгновенно показываем форму входа
        elAuthForms.style.display = 'block';
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
    if(!n) return alert("Введите ник!");
    auth.createUserWithEmailAndPassword(e, p).then(c => {
        db.ref('users/' + c.user.uid).set({ username: n, email: e });
    }).catch(err => alert(err.message));
}

function logout() { auth.signOut(); location.reload(); }

// --- 3. МЕНЮ (DASHBOARD) ---
function openDashboard() {
    elAuthScreen.style.display = 'none';
    elDashboard.style.display = 'block';
    elGameUI.style.display = 'none';
    
    document.getElementById('dash-username').innerText = currentUsername;
    document.getElementById('dash-avatar').innerText = currentUsername.charAt(0).toUpperCase();

    // Генерация списка игр (статичная, быстрая)
    const games = [
        { id: "city", title: "Blox City", color: "#44aa44", icon: "🏙️" },
        { id: "parkour", title: "Obby Parkour", color: "#aa4444", icon: "🔥" },
        { id: "space", title: "Space Base", color: "#222244", icon: "🚀" }
    ];
    
    const list = document.getElementById('games-list');
    list.innerHTML = '';
    games.forEach(g => {
        // Используем шаблонную строку для скорости
        list.insertAdjacentHTML('beforeend', `
            <div class="game-card" onclick="startGame('${g.id}')">
                <div class="game-icon" style="background:${g.color}">${g.icon}</div>
                <div><h4>${g.title}</h4></div>
            </div>
        `);
    });
}

function exitGame() {
    gameActive = false;
    if (document.exitPointerLock) document.exitPointerLock();
    // Просто перезагружаем страницу для полной очистки памяти (самый надежный способ на мобилках)
    location.reload();
}

// --- ЧАТ (ОПТИМИЗИРОВАННЫЙ) ---
function initChat() {
    const chatRef = db.ref('games/global/chat');
    const msgBox = document.getElementById('chat-messages');
    msgBox.innerHTML = ''; 

    // Загружаем только последние 15 сообщений для скорости
    chatRef.limitToLast(15).on('child_added', snap => {
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
    db.ref('games/global/chat').push({ user: currentUsername, text: text });
    input.value = "";
}

// --- 4. ИГРОВОЙ ДВИЖОК (THREE.JS) ---
function startGame(mode) {
    gameActive = true;
    elDashboard.style.display = 'none';
    elGameUI.style.display = 'block';

    // Настройка UI под устройство (Мгновенно)
    if (isMobile) {
        document.getElementById('mobile-controls').style.display = 'block';
        document.getElementById('pc-controls-hint').style.display = 'none';
    } else {
        document.getElementById('mobile-controls').style.display = 'none';
        document.getElementById('pc-controls-hint').style.display = 'block';
        document.body.onclick = () => { if(gameActive) document.body.requestPointerLock(); };
    }

    initChat(); // Включаем чат

    // Инициализация 3D сцены
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); // Оптимизация рендера
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Тени (можно выключить для слабых телефонов)
    
    // Очистка и добавление канваса
    const container = document.body;
    // Удаляем старые канвасы если есть
    const oldCanvases = container.getElementsByTagName('canvas');
    while(oldCanvases[0]) oldCanvases[0].parentNode.removeChild(oldCanvases[0]);
    container.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(20,50,10); 
    dl.castShadow = true; 
    scene.add(dl);

    // Генерация уровня (Быстрая)
    let platforms = [];
    if (mode === 'city') {
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x333333}));
        floor.rotation.x = -Math.PI/2; floor.receiveShadow=true; scene.add(floor);
        for(let i=0; i<15; i++) {
            const h = 5 + Math.random()*15;
            const b = new THREE.Mesh(new THREE.BoxGeometry(5,h,5), new THREE.MeshStandardMaterial({color:0x888888}));
            b.position.set((Math.random()-0.5)*80, h/2, (Math.random()-0.5)*80);
            b.castShadow=true; scene.add(b); platforms.push(b);
        }
    } else if (mode === 'parkour') {
        scene.background = new THREE.Color(0x330000);
        const lava = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshBasicMaterial({color:0xff0000}));
        lava.rotation.x = -Math.PI/2; scene.add(lava);
        const start = new THREE.Mesh(new THREE.BoxGeometry(5,1,5), new THREE.MeshStandardMaterial({color:0x555555}));
        start.position.y=0.5; scene.add(start); platforms.push(start);
        for(let i=1; i<20; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(3,1,3), new THREE.MeshStandardMaterial({color:0x00ff00}));
            p.position.set((Math.random()-0.5)*10, 2+Math.random()*3, -i*6);
            scene.add(p); platforms.push(p);
        }
    } else {
        // Space
        scene.background = new THREE.Color(0x000000);
        const moon = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x555555}));
        moon.rotation.x = -Math.PI/2; scene.add(moon);
    }

    // Персонаж (Roblox Style - оптимизированный)
    const playerGroup = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({color:0xFFD700});
    const matTorso = new THREE.MeshStandardMaterial({color:0x0000FF});
    const matLegs = new THREE.MeshStandardMaterial({color:0x00FF00});

    const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), matSkin); head.position.y=3.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), matTorso); torso.position.y=2;
    
    // Ноги и руки
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), matLegs); lLeg.position.y=-1;
    const lLegG = new THREE.Group(); lLegG.add(lLeg); lLegG.position.set(-0.5,1,0);
    
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), matLegs); rLeg.position.y=-1;
    const rLegG = new THREE.Group(); rLegG.add(rLeg); rLegG.position.set(0.5,1,0);

    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), matSkin); lArm.position.y=-1;
    const lArmG = new THREE.Group(); lArmG.add(lArm); lArmG.position.set(-1.5,3,0);

    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), matSkin); rArm.position.y=-1;
    const rArmG = new THREE.Group(); rArmG.add(rArm); rArmG.position.set(1.5,3,0);

    playerGroup.add(head, torso, lLegG, rLegG, lArmG, rArmG);
    playerGroup.userData = {lg:lLegG, rg:rLegG, la:lArmG, ra:rArmG}; // Ссылки для анимации

    scene.add(playerGroup);
    camera.position.set(0,5,-10);

    // УПРАВЛЕНИЕ
    let moveFwd = 0;
    let moveTurn = 0;
    let vy = 0;
    let pcKeys = { w:false, a:false, s:false, d:false };

    if (isMobile) {
        const zone = document.getElementById('joystick-zone');
        // Очистка старых джойстиков если были
        zone.innerHTML = ''; 
        joystickManager = nipplejs.create({ zone: zone, mode: 'static', position: {left:'50%', top:'50%'}, color:'white', size: 100 });
        joystickManager.on('move', (e, data) => {
            const force = Math.min(data.force, 2);
            moveFwd = Math.sin(data.angle.radian) * force * 0.15;
            moveTurn = Math.cos(data.angle.radian) * 0.08;
        });
        joystickManager.on('end', () => { moveFwd=0; moveTurn=0; });
        
        const btnJump = document.getElementById('btnJump');
        // Используем touchstart для мгновенной реакции
        btnJump.addEventListener('touchstart', (e)=>{ e.preventDefault(); if(playerGroup.position.y<=0.1) vy=0.3; }, {passive: false});
    } else {
        document.addEventListener('keydown', (e) => {
            if(e.code==='KeyW') pcKeys.w = true;
            if(e.code==='KeyS') pcKeys.s = true;
            if(e.code==='KeyA') pcKeys.a = true;
            if(e.code==='KeyD') pcKeys.d = true;
            if(e.code==='Space' && playerGroup.position.y<=0.1) vy=0.3;
        });
        document.addEventListener('keyup', (e) => {
            if(e.code==='KeyW') pcKeys.w = false;
            if(e.code==='KeyS') pcKeys.s = false;
            if(e.code==='KeyA') pcKeys.a = false;
            if(e.code==='KeyD') pcKeys.d = false;
        });
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                playerGroup.rotation.y -= e.movementX * 0.002;
            }
        });
    }

    // Игровой цикл
    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        // Расчет ПК движения
        if (!isMobile) {
            moveFwd = 0;
            if(pcKeys.w) moveFwd = 0.2;
            if(pcKeys.s) moveFwd = -0.2;
            if(pcKeys.a) playerGroup.rotation.y += 0.05;
            if(pcKeys.d) playerGroup.rotation.y -= 0.05;
        }

        // Движение и анимация
        if (moveFwd !== 0) {
            playerGroup.translateZ(moveFwd);
            if(isMobile) playerGroup.rotation.y -= moveTurn;

            // Анимация ходьбы
            const t = Date.now() * 0.015;
            playerGroup.userData.lg.rotation.x = Math.sin(t);
            playerGroup.userData.rg.rotation.x = -Math.sin(t);
            playerGroup.userData.la.rotation.x = -Math.sin(t);
            playerGroup.userData.ra.rotation.x = Math.sin(t);
        } else {
            // Сброс позы
            playerGroup.userData.lg.rotation.x = 0;
            playerGroup.userData.rg.rotation.x = 0;
            playerGroup.userData.la.rotation.x = 0;
            playerGroup.userData.ra.rotation.x = 0;
        }

        // Гравитация и Паркур-смерть
        if (mode === 'parkour' && playerGroup.position.y < 0.5) {
             // Смерть в лаве
             playerGroup.position.set(0,5,0); vy=0;
        }

        if (playerGroup.position.y > 0 || vy > 0) {
            playerGroup.position.y += vy;
            vy -= (mode === 'space' ? 0.005 : 0.015); // Разная гравитация
        } else {
            playerGroup.position.y = 0;
            vy = 0;
        }

        // Камера
        const offset = new THREE.Vector3(0, 5, -8).applyMatrix4(playerGroup.matrixWorld);
        camera.position.lerp(offset, 0.1); // Плавное слежение
        camera.lookAt(playerGroup.position.x, playerGroup.position.y+2, playerGroup.position.z);

        renderer.render(scene, camera);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    animate();
}