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
let gameActive = false;

// --- АВТОРИЗАЦИЯ ---
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

// --- МЕНЮ ---
function openDashboard(username) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('dash-username').innerText = username;
    document.getElementById('dash-avatar').innerText = username[0];

    const games = [
        { id: "city", title: "Blox City RP", icon: "🏙️", color: "#44aa44", desc: "Hangout" },
        { id: "parkour", title: "Floor is Lava", icon: "🔥", color: "#aa4444", desc: "Obby" },
        { id: "space", title: "Moon Base", icon: "🚀", color: "#222244", desc: "Space" }
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

// --- ИГРОВОЙ ДВИЖОК ---
function startGame(gameMode) {
    gameActive = true;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    const oldCanvas = document.querySelector('canvas');
    if(oldCanvas) oldCanvas.remove();
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    let gravity = 0.015;
    let jumpPower = 0.3;
    let platforms = [];

    // --- ГЕНЕРАЦИЯ УРОВНЯ ---
    if (gameMode === 'city') {
        scene.background = new THREE.Color(0x87CEEB);
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
        for(let i=0; i<20; i++) {
            const h = 10 + Math.random() * 20;
            const building = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            building.position.set((Math.random()-0.5)*100, h/2, (Math.random()-0.5)*100);
            building.castShadow = true;
            scene.add(building);
            platforms.push(building);
        }
    } else if (gameMode === 'parkour') {
        scene.background = new THREE.Color(0x220000);
        const lava = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        lava.rotation.x = -Math.PI / 2;
        scene.add(lava);
        const start = new THREE.Mesh(new THREE.BoxGeometry(10,1,10), new THREE.MeshStandardMaterial({color:0x555555}));
        start.position.y = 0.5; scene.add(start); platforms.push(start);
        for(let i=1; i<20; i++) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(3,1,3), new THREE.MeshStandardMaterial({color:0x00ff00}));
            p.position.set((Math.random()-0.5)*10, 2+Math.random()*2, -i*5);
            p.castShadow = true; scene.add(p); platforms.push(p);
        }
    } else if (gameMode === 'space') {
        scene.background = new THREE.Color(0x000000);
        gravity = 0.005; jumpPower = 0.4;
        const moon = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        moon.rotation.x = -Math.PI / 2;
        scene.add(moon);
        for(let i=0; i<30; i++) {
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2), new THREE.MeshStandardMaterial({ color: 0x555555 }));
            rock.position.set((Math.random()-0.5)*100, 1, (Math.random()-0.5)*100);
            scene.add(rock);
        }
    }

    // --- НОВЫЙ СКИН (ROBLOX STYLE) ---
    function createRobloxAvatar() {
        const character = new THREE.Group();

        // Материалы (Классический Нуб)
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Желтая кожа
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0x0000FF }); // Синяя майка
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x44AA44 }); // Зеленые штаны

        // 1. Голова (Слегка скругленный куб или цилиндр, возьмем куб для стиля R6)
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat);
        head.position.y = 4.6;
        head.castShadow = true;
        character.add(head);

        // Лицо (Глаза и рот - просто черные блоки)
        const eyeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.3, 0.1, 0.6); // На лице
        head.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.3, 0.1, 0.6);
        head.add(rightEye);
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), eyeMat);
        mouth.position.set(0, -0.3, 0.6);
        head.add(mouth);

        // 2. Торс (Квадратный блок)
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), torsoMat);
        torso.position.y = 3;
        torso.castShadow = true;
        character.add(torso);

        // 3. Руки (Отдельные блоки)
        const armGeo = new THREE.BoxGeometry(1, 2, 1);
        
        // Левая рука (Группа для вращения в плече)
        const leftArmGroup = new THREE.Group();
        const leftArm = new THREE.Mesh(armGeo, skinMat);
        leftArm.position.y = -1; // Сдвиг вниз, чтобы ось вращения была сверху
        leftArmGroup.add(leftArm);
        leftArmGroup.position.set(-1.6, 4, 0); // Плечо
        character.add(leftArmGroup);

        // Правая рука
        const rightArmGroup = new THREE.Group();
        const rightArm = new THREE.Mesh(armGeo, skinMat);
        rightArm.position.y = -1;
        rightArmGroup.add(rightArm);
        rightArmGroup.position.set(1.6, 4, 0); // Плечо
        character.add(rightArmGroup);

        // 4. Ноги (Отдельные блоки)
        const legGeo = new THREE.BoxGeometry(1, 2, 1);

        // Левая нога (Группа для вращения в бедре)
        const leftLegGroup = new THREE.Group();
        const leftLeg = new THREE.Mesh(legGeo, pantsMat);
        leftLeg.position.y = -1;
        leftLegGroup.add(leftLeg);
        leftLegGroup.position.set(-0.5, 2, 0); // Бедро
        character.add(leftLegGroup);

        // Правая нога
        const rightLegGroup = new THREE.Group();
        const rightLeg = new THREE.Mesh(legGeo, pantsMat);
        rightLeg.position.y = -1;
        rightLegGroup.add(rightLeg);
        rightLegGroup.position.set(0.5, 2, 0); // Бедро
        character.add(rightLegGroup);

        // Сохраняем ссылки для анимации
        character.userData = { 
            lLeg: leftLegGroup, rLeg: rightLegGroup, 
            lArm: leftArmGroup, rArm: rightArmGroup 
        };

        return character;
    }

    const player = createRobloxAvatar();
    scene.add(player);
    camera.position.set(0, 6, -10);

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

    // --- ЦИКЛ ---
    function checkCollision() {
        let groundY = 0;
        let isOverPlatform = false;
        platforms.forEach(plat => {
            const box = new THREE.Box3().setFromObject(plat);
            if (player.position.x >= box.min.x && player.position.x <= box.max.x &&
                player.position.z >= box.min.z && player.position.z <= box.max.z) {
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

        // Движение
        if(moveFwd !== 0) {
            player.translateZ(moveFwd);
            player.rotation.y -= moveTurn;
            
            // Анимация ходьбы (Машем руками и ногами)
            const speed = Date.now() * 0.01;
            player.userData.lLeg.rotation.x = Math.sin(speed);
            player.userData.rLeg.rotation.x = -Math.sin(speed);
            player.userData.lArm.rotation.x = -Math.sin(speed); // Руки идут противофазой ногам
            player.userData.rArm.rotation.x = Math.sin(speed);
        } else {
            // Стоим смирно
            player.userData.lLeg.rotation.x = 0;
            player.userData.rLeg.rotation.x = 0;
            player.userData.lArm.rotation.x = 0;
            player.userData.rArm.rotation.x = 0;
        }

        // Физика
        const groundInfo = checkCollision();
        if (gameMode === 'parkour' && !groundInfo.hit && player.position.y <= 0.5) {
            player.position.set(0, 5, 0); vy = 0; // Респавн в лаве
        }

        if (player.position.y > groundInfo.y || vy > 0) {
            player.position.y += vy;
            vy -= gravity;
            onGround = false;
        } else {
            player.position.y = groundInfo.y;
            vy = 0;
            onGround = true;
        }

        // Камера
        const camOff = new THREE.Vector3(0, 6, -12).applyMatrix4(player.matrixWorld);
        camera.position.lerp(camOff, 0.1);
        camera.lookAt(player.position.x, player.position.y + 3, player.position.z);

        renderer.render(scene, camera);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}