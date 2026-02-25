// --- 1. FIREBASE CONFIG ---
// ВСТАВЬ СЮДА СВОИ КЛЮЧИ МЕЖДУ СКОБКАМИ { ... } !!!
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
const statusMsg = document.getElementById('status-msg');

// --- 2. ЛОГИКА АВТОРИЗАЦИИ ---
function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    if(!email || !password || !username) { statusMsg.innerText = "Заполните все поля!"; return; }

    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            db.ref('users/' + cred.user.uid).set({ username: username, email: email });
            statusMsg.innerText = "Успех!";
            openDashboard(username); // Переход в меню
        })
        .catch((e) => statusMsg.innerText = "Ошибка: " + e.message);
}

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((cred) => {
            db.ref('users/' + cred.user.uid).once('value').then((snap) => {
                const name = snap.val()?.username || "Player";
                openDashboard(name); // Переход в меню
            });
        })
        .catch((e) => statusMsg.innerText = "Ошибка входа!");
}

// --- 3. ГЛАВНОЕ МЕНЮ (DASHBOARD) ---
function openDashboard(username) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    // Настройка профиля
    document.getElementById('dash-username').innerText = username;
    // Аватарка - первая буква имени на цветном фоне
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.innerText = username.charAt(0).toUpperCase();
    avatarEl.style.backgroundColor = '#' + Math.floor(Math.random()*16777215).toString(16);

    // Генерация списка игр
    const gamesList = document.getElementById('games-list');
    gamesList.innerHTML = ''; // Очистить

    const games = [
        { title: "Blox City", color: "#44aa44", icon: "🏙️", id: "city" },
        { title: "Obby Parkour", color: "#aa4444", icon: "🏃", id: "obby" },
        { title: "Tycoon", color: "#4444aa", icon: "💰", id: "tycoon" }
    ];

    games.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-img" style="background:${game.color}">${game.icon}</div>
            <div class="game-title">${game.title}</div>
        `;
        card.onclick = () => {
            if(game.id === "city") startGame(username);
            else alert("Эта игра в разработке!");
        };
        gamesList.appendChild(card);
    });
}

// --- 4. 3D ИГРА (THREE.JS) ---
function startGame(playerName) {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Освещение
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x44aa44 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Блоки
    const boxGeo = new THREE.BoxGeometry(4,4,4);
    for(let i=0; i<10; i++){
        const mesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
        mesh.position.set((Math.random()-0.5)*50, 2, (Math.random()-0.5)*50);
        mesh.castShadow = true;
        scene.add(mesh);
    }

    // Персонаж
    function createChar(color) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({color:color});
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.5,2,1), mat); body.position.y=2;
        const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xffd700})); head.position.y=3.5;
        g.add(body, head);
        return g;
    }

    const player = createChar(0x0088ff);
    scene.add(player);

    // Боты
    const bots = [];
    for(let i=0; i<5; i++){
        const b = createChar(Math.random()*0xffffff);
        b.position.set((Math.random()-0.5)*30, 0, (Math.random()-0.5)*30);
        scene.add(b);
        bots.push({mesh: b, speed: 0.05, rot: Math.random()*6});
    }

    camera.position.set(0, 5, -8);
    
    // Управление
    let moveFwd = false;
    const btnMove = document.getElementById('btnMove');
    const btnJump = document.getElementById('btnJump');
    
    btnMove.addEventListener('touchstart', (e)=>{e.preventDefault(); moveFwd=true;});
    btnMove.addEventListener('touchend', (e)=>{e.preventDefault(); moveFwd=false;});
    btnMove.addEventListener('mousedown', ()=>{moveFwd=true;});
    btnMove.addEventListener('mouseup', ()=>{moveFwd=false;});

    let vy = 0;
    btnJump.addEventListener('touchstart', (e)=>{
        e.preventDefault(); if(player.position.y<=0.1) vy = 0.3;
    });

    function animate() {
        requestAnimationFrame(animate);

        if(player.position.y > 0 || vy > 0) { player.position.y += vy; vy -= 0.015; }
        else { player.position.y = 0; vy = 0; }

        if(moveFwd) player.translateZ(0.15);

        // Камера
        const offset = new THREE.Vector3(0, 6, -10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(offset, 0.1);
        camera.lookAt(player.position);

        // Боты
        bots.forEach(b => {
            b.mesh.translateZ(b.speed);
            b.mesh.rotation.y += 0.01;
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