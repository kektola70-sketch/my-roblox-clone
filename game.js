// --- 1. FIREBASE CONFIG ---
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

let currentUser = null;
let joystickManager = null;
let gameActive = false; // Чтобы останавливать игру при выходе

// --- АВТОРИЗАЦИЯ И МЕНЮ ---
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
    if(!name) return alert("Нужен никнейм!");
    auth.createUserWithEmailAndPassword(email, pass).then(cred => {
        db.ref('users/' + cred.user.uid).set({ username: name, email: email, score: 0 });
    }).catch(e => alert(e.message));
}

function logout() { auth.signOut(); location.reload(); }

function openDashboard(username) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('dash-username').innerText = username;
    document.getElementById('dash-avatar').innerText = username[0];

    // Генерация списка игр с разными ID
    const games = [
        { id: "city", title: "Blox City RP", icon: "🏙️", color: "#44aa44", desc: "Hangout & Roleplay" },
        { id: "parkour", title: "Floor is Lava", icon: "🔥", color: "#aa4444", desc: "Jump or Die!" },
        { id: "space", title: "Moon Base", icon: "🚀", color: "#222244", desc: "Low Gravity" }
    ];
    
    const gList = document.getElementById('games-list');
    gList.innerHTML = '';
    games.forEach(g => {
        gList.innerHTML += `
            <div class="game-card" onclick="startGame('${g.id}')">
                <div class="game-icon" style="background:${g.color}">${g.icon}</div>
                <div class="game-details">
                    <h4>${g.title}</h4>
                    <p>${g.desc}</p>
                </div>
                <button class="play-small">PLAY</button>
            </div>
        `;
    });
}

function exitGame() {
    if(joystickManager) { joystickManager.destroy(); joystickManager = null; }
    gameActive = false;
    location.reload(); 
}

// --- 3. ИГРОВОЙ ДВИЖОК ---
function startGame(gameMode) {
    gameActive = true;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    // Настройка сцены
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    const oldCanvas = document.querySelector('canvas');
    if(oldCanvas) oldCanvas.remove();
    document.body.appendChild(renderer.domElement);

    // Освещение
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 50, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Глобальные переменные физики
    let gravity = 0.015;
    let jumpPower = 0.3;
    let platforms = []; // Массив для проверки столкновений
    let isLava = false; // Для паркура

    // === ЗАГРУЗКА УРОВНЕЙ ===
    function loadLevel(mode) {
        if (mode === 'city') {
            // --- ГОРОД ---
            scene.background = new THREE.Color(0x87CEEB); // Голубое небо
            scene.fog = new THREE.Fog(0x87CEEB, 10, 80);
            
            // Асфальт
            const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x333333 }));
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);

            // Здания
            for(let i=0; i<20; i++) {
                const h = 10 + Math.random() * 20;
                const building = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
                building.position.set((Math.random()-0.5)*100, h/2, (Math.random()-0.5)*100);
                building.castShadow = true;
                scene.add(building);
                
                // Окна (светятся)
                const win = new THREE.Mesh(new THREE.BoxGeometry(6.1, h-2, 6.1), new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true, transparent:true, opacity:0.1 }));
                win.position.copy(building.position);
                scene.add(win);
                
                platforms.push(building); // Можно запрыгнуть на здание
            }
        } 
        else if (mode === 'parkour') {
            // --- ПАРКУР ---
            scene.background = new THREE.Color(0x220000); // Темно-красное небо
            scene.fog = new THREE.Fog(0x220000, 10, 60);
            isLava = true; // Пол убивает

            // Лава
            const lava = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            lava.rotation.x = -Math.PI / 2;
            scene.add(lava);

            // Стартовая платформа
            const startPlat = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
            startPlat.position.set(0, 0.5, 0);
            scene.add(startPlat);
            platforms.push(startPlat);

            // Паркур блоки
            for(let i=1; i<15; i++) {
                const size = 3;
                const plat = new THREE.Mesh(new THREE.BoxGeometry(size, 1, size), new THREE.MeshStandardMaterial({ color: 0x00ff00 }));
                // Каждый блок чуть дальше и выше/ниже
                plat.position.set(0, 2 + Math.random()*2, -i * 6); 
                plat.castShadow = true;
                scene.add(plat);
                platforms.push(plat);
            }
        } 
        else if (mode === 'space') {
            // --- КОСМОС ---
            scene.background = new THREE.Color(0x000000); // Космос
            gravity = 0.005; // Низкая гравитация
            jumpPower = 0.4; // Высокий прыжок

            // Лунный грунт
            const moon = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1 }));
            moon.rotation.x = -Math.PI / 2;
            moon.receiveShadow = true;
            scene.add(moon);

            // Звезды
            const starsGeo = new THREE.BufferGeometry();
            const starsCnt = 1000;
            const posArray = new Float32Array(starsCnt * 3);
            for(let i=0; i<starsCnt*3; i++) posArray[i] = (Math.random()-0.5)*500;
            starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const starsMat = new THREE.PointsMaterial({size: 0.5, color: 0xffffff});
            scene.add(new THREE.Points(starsGeo, starsMat));

            // Камни
            for(let i=0; i<20; i++) {
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2), new THREE.MeshStandardMaterial({ color: 0x555555 }));
                rock.position.set((Math.random()-0.5)*80, 1, (Math.random()-0.5)*80);
                rock.castShadow = true;
                scene.add(rock);
            }
        }
    }

    loadLevel(gameMode);

    // --- ИГРОК ---
    const player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), new THREE.MeshStandardMaterial({color: 0x0088ff}));
    body.position.y = 2;
    const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0xffd700}));
    head.position.y = 3.6;
    player.add(body, head);
    
    // Ноги (для анимации)
    const legGeo = new THREE.BoxGeometry(0.7, 2, 0.7);
    const legMat = new THREE.MeshStandardMaterial({color: 0x111111});
    const lLeg = new THREE.Mesh(legGeo, legMat); lLeg.position.y = -1;
    const rLeg = new THREE.Mesh(legGeo, legMat); rLeg.position.y = -1;
    const lGroup = new THREE.Group(); lGroup.add(lLeg); lGroup.position.set(-0.4, 1, 0);
    const rGroup = new THREE.Group(); rGroup.add(rLeg); rGroup.position.set(0.4, 1, 0);
    player.add(lGroup, rGroup);

    scene.add(player);
    camera.position.set(0, 5, 10);

    // --- УПРАВЛЕНИЕ ---
    const joyZone = document.getElementById('joystick-zone');
    joystickManager = nipplejs.create({ zone: joyZone, mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });
    
    let moveFwd = 0;
    let moveTurn = 0;
    joystickManager.on('move', (evt, data) => {
        const force = Math.min(data.force, 2);
        moveFwd = Math.sin(data.angle.radian) * force * 0.15;
        moveTurn = Math.cos(data.angle.radian) * 0.08; 
    });
    joystickManager.on('end', () => { moveFwd = 0; moveTurn = 0; });

    let vy = 0;
    let onGround = false;
    document.getElementById('btnJump').addEventListener('touchstart', (e) => { e.preventDefault(); if(onGround) vy = jumpPower; });
    document.getElementById('btnJump').addEventListener('mousedown', () => { if(onGround) vy = jumpPower; });

    // --- ФИЗИКА И ЦИКЛ ---
    function checkCollision() {
        // Простая проверка: находимся ли мы над платформой
        let groundY = 0;
        let isOverPlatform = false;

        platforms.forEach(plat => {
            // Упрощенная коллизия: проверяем границы по X и Z
            const box = new THREE.Box3().setFromObject(plat);
            if (player.position.x >= box.min.x && player.position.x <= box.max.x &&
                player.position.z >= box.min.z && player.position.z <= box.max.z) {
                // Если мы над платформой, то "пол" поднимается до её верха
                if (player.position.y >= box.max.y - 0.5) { 
                    groundY = Math.max(groundY, box.max.y);
                    isOverPlatform = true;
                }
            }
        });

        return { y: groundY, hit: isOverPlatform };
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        // 1. Движение
        if(moveFwd !== 0) {
            player.translateZ(moveFwd);
            player.rotation.y -= moveTurn;
            // Анимация ног
            lGroup.rotation.x = Math.sin(Date.now()*0.01);
            rGroup.rotation.x = -Math.sin(Date.now()*0.01);
        } else {
            lGroup.rotation.x = 0;
            rGroup.rotation.x = 0;
        }

        // 2. Гравитация и Столкновения
        const groundInfo = checkCollision();
        let groundLevel = groundInfo.y;

        // Логика "Лавы" (Паркур)
        if (gameMode === 'parkour') {
            // В паркуре пол (уровень 0) - это смерть
            if (!groundInfo.hit && player.position.y <= 0.5) {
                // СМЕРТЬ! Респавн
                player.position.set(0, 5, 0);
                vy = 0;
            }
        }

        if (player.position.y > groundLevel || vy > 0) {
            player.position.y += vy;
            vy -= gravity;
            onGround = false;
        } else {
            player.position.y = groundLevel;
            vy = 0;
            onGround = true;
        }

        // 3. Камера
        const camOff = new THREE.Vector3(0, 6, -10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(camOff, 0.1);
        camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

        renderer.render(scene, camera);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}