// 1. КОНФИГУРАЦИЯ (ТВОИ КЛЮЧИ)
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

// --- ЛОГИКА ВХОДА ---
const statusText = document.getElementById('status-text');
const loginForms = document.getElementById('login-forms');
const authScreen = document.getElementById('auth-screen');
const gameUI = document.getElementById('game-ui');

// Проверка: вошел ли уже игрок?
auth.onAuthStateChanged(user => {
    if (user) {
        statusText.innerText = "Вход выполнен! Запуск...";
        // Получаем имя и запускаем игру
        db.ref('users/' + user.uid).once('value').then(snap => {
            const name = snap.val()?.username || "Player";
            startGame(name);
        });
    } else {
        statusText.innerText = "Пожалуйста, войдите";
        loginForms.style.display = 'block';
    }
});

function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    statusText.innerText = "Проверка...";
    auth.signInWithEmailAndPassword(email, pass).catch(e => alert("Ошибка: " + e.message));
}

function register() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const name = document.getElementById('username').value;
    if(!name) return alert("Введите никнейм!");
    
    statusText.innerText = "Создание...";
    auth.createUserWithEmailAndPassword(email, pass)
        .then(cred => {
            db.ref('users/' + cred.user.uid).set({ username: name, email: email });
        })
        .catch(e => alert("Ошибка: " + e.message));
}

function logout() {
    auth.signOut();
    location.reload();
}

// --- ЛОГИКА ИГРЫ (THREE.JS) ---
function startGame(playerName) {
    // Скрываем меню, показываем игру
    authScreen.style.display = 'none';
    gameUI.style.display = 'block';
    document.getElementById('ui-username').innerText = playerName;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Свет
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Мир (Пол)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x44aa44 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Декорации (Рандомные блоки)
    for(let i=0; i<15; i++) {
        const h = 2 + Math.random()*5;
        const geo = new THREE.BoxGeometry(3, h, 3);
        const mat = new THREE.MeshStandardMaterial({ color: Math.random()*0xffffff });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((Math.random()-0.5)*60, h/2, (Math.random()-0.5)*60);
        mesh.castShadow = true;
        scene.add(mesh);
    }

    // --- ПЕРСОНАЖ ---
    function createChar(color) {
        const group = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({color: color});
        
        // Тело
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 1), mat);
        body.position.y = 2;
        
        // Голова
        const head = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({color: 0xffd700}));
        head.position.y = 3.6;
        
        // Ноги (для анимации)
        const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2, 0.7), new THREE.MeshStandardMaterial({color: 0x222222}));
        lLeg.position.y = -1;
        const lLegG = new THREE.Group(); lLegG.add(lLeg); lLegG.position.set(-0.4, 1, 0);

        const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2, 0.7), new THREE.MeshStandardMaterial({color: 0x222222}));
        rLeg.position.y = -1;
        const rLegG = new THREE.Group(); rLegG.add(rLeg); rLegG.position.set(0.4, 1, 0);

        group.add(body, head, lLegG, rLegG);
        group.userData = { lLeg: lLegG, rLeg: rLegG };
        return group;
    }

    const player = createChar(0x0088ff);
    scene.add(player);
    camera.position.set(0, 5, -8);

    // --- БОТЫ ---
    const bots = [];
    for(let i=0; i<8; i++) {
        const b = createChar(Math.random()*0xffffff);
        b.position.set((Math.random()-0.5)*40, 0, (Math.random()-0.5)*40);
        scene.add(b);
        bots.push({ mesh: b, speed: 0.05 + Math.random()*0.05, rot: Math.random()*100 });
    }

    // --- УПРАВЛЕНИЕ ---
    let moving = false;
    let walkAnim = 0;
    const btnMove = document.getElementById('btnMove');
    const btnJump = document.getElementById('btnJump');

    btnMove.addEventListener('touchstart', (e)=>{ e.preventDefault(); moving=true; });
    btnMove.addEventListener('touchend', (e)=>{ e.preventDefault(); moving=false; });
    btnMove.addEventListener('mousedown', ()=>{ moving=true; });
    btnMove.addEventListener('mouseup', ()=>{ moving=false; });

    let vy = 0;
    btnJump.addEventListener('touchstart', (e)=>{ 
        e.preventDefault(); if(player.position.y<=0.1) vy=0.3; 
    });
    btnJump.addEventListener('mousedown', ()=>{ 
        if(player.position.y<=0.1) vy=0.3; 
    });

    // --- ЦИКЛ ---
    function animate() {
        requestAnimationFrame(animate);

        // Игрок
        if(player.position.y > 0 || vy > 0) {
            player.position.y += vy;
            vy -= 0.015;
        } else {
            player.position.y = 0;
            vy = 0;
        }

        if(moving) {
            player.translateZ(0.15);
            walkAnim += 0.2;
            player.userData.lLeg.rotation.x = Math.sin(walkAnim);
            player.userData.rLeg.rotation.x = -Math.sin(walkAnim);
        } else {
            player.userData.lLeg.rotation.x = 0;
            player.userData.rLeg.rotation.x = 0;
        }

        // Камера
        const camOff = new THREE.Vector3(0, 5, -8).applyMatrix4(player.matrixWorld);
        camera.position.lerp(camOff, 0.1);
        camera.lookAt(player.position.x, player.position.y+2, player.position.z);

        // Боты
        bots.forEach(bot => {
            bot.mesh.translateZ(bot.speed);
            bot.mesh.userData.lLeg.rotation.x = Math.sin(Date.now()*0.01);
            bot.mesh.userData.rLeg.rotation.x = -Math.sin(Date.now()*0.01);
            
            if(Math.random() < 0.01) bot.mesh.rotation.y += Math.random();
            if(bot.mesh.position.length() > 40) bot.mesh.lookAt(0,0,0);
        });

        renderer.render(scene, camera);
    }
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth/window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}