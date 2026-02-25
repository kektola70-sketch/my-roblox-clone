// --- ЧАСТЬ 1: НАСТРОЙКА FIREBASE И ВХОД ---

// Твоя конфигурация (адаптированная под браузер)
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

// Инициализация (Классический метод для HTML)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.database();

const statusMsg = document.getElementById('status-msg');

// --- ЛОГИКА АВТОРИЗАЦИИ ---

// 1. Регистрация
function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    if(!email || !password) { 
        statusMsg.innerText = "Введите почту и пароль!"; 
        return; 
    }
    if(!username) { 
        statusMsg.innerText = "Придумайте никнейм!"; 
        return; 
    }

    statusMsg.innerText = "Создание аккаунта...";
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Сохраняем имя игрока в базу данных
            db.ref('users/' + user.uid).set({
                username: username,
                email: email
            });
            statusMsg.innerText = "Успех! Запуск игры...";
            statusMsg.style.color = "green";
            // Даем секунду прочитать сообщение и запускаем
            setTimeout(() => startGame(username), 1000);
        })
        .catch((error) => {
            let errorMsg = "Ошибка регистрации";
            if(error.code === 'auth/email-already-in-use') errorMsg = "Эта почта уже занята!";
            if(error.code === 'auth/weak-password') errorMsg = "Пароль слишком простой (нужно 6+ символов)";
            statusMsg.innerText = errorMsg;
            statusMsg.style.color = "red";
            console.error(error);
        });
}

// 2. Вход
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if(!email || !password) { 
        statusMsg.innerText = "Введите почту и пароль!"; 
        return; 
    }

    statusMsg.innerText = "Вход в систему...";

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Ищем имя пользователя в базе
            db.ref('users/' + user.uid).once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    const name = data && data.username ? data.username : "Игрок";
                    statusMsg.innerText = "Добро пожаловать, " + name + "!";
                    statusMsg.style.color = "green";
                    setTimeout(() => startGame(name), 1000);
                });
        })
        .catch((error) => {
            let errorMsg = "Ошибка входа";
            if(error.code === 'auth/user-not-found') errorMsg = "Пользователь не найден";
            if(error.code === 'auth/wrong-password') errorMsg = "Неверный пароль";
            statusMsg.innerText = errorMsg;
            statusMsg.style.color = "red";
            console.error(error);
        });
}


// --- ЧАСТЬ 2: ИГРОВОЙ МИР (Three.js) ---

function startGame(playerName) {
    // Скрываем меню входа
    document.getElementById('auth-screen').style.display = 'none';
    // Показываем интерфейс игры
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('player-name').innerText = playerName;

    // --- НАСТРОЙКА 3D СЦЕНЫ ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Небо
    scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Пол (Трава)
    const floorGeometry = new THREE.PlaneGeometry(200, 200);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Декорации (Кубики)
    function createBlock(x, y, z, color) {
        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mat = new THREE.MeshStandardMaterial({ color: color });
        const block = new THREE.Mesh(geo, mat);
        block.position.set(x, y, z);
        block.castShadow = true;
        block.receiveShadow = true;
        scene.add(block);
    }
    createBlock(-10, 2, -10, 0xA52A2A);
    createBlock(10, 2, -20, 0x333333);
    createBlock(0, 2, -25, 0x0000FF);

    // --- СОЗДАНИЕ ПЕРСОНАЖА ---
    function createRobloxChar(colorShirt, colorPants) {
        const charGroup = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: colorShirt });
        const pantsMat = new THREE.MeshStandardMaterial({ color: colorPants });

        // Торс
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
        torso.position.y = 2; charGroup.add(torso);
        // Голова
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat);
        head.position.y = 3.6; charGroup.add(head);
        // Руки
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), skinMat);
        leftArm.position.set(-1.5, 2, 0); charGroup.add(leftArm);
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), skinMat);
        rightArm.position.set(1.5, 2, 0); charGroup.add(rightArm);

        // Ноги (с суставами для анимации)
        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
        leftLeg.position.y = -1;
        const lLegGroup = new THREE.Group(); lLegGroup.add(leftLeg); lLegGroup.position.set(-0.5, 1, 0);
        charGroup.add(lLegGroup);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
        rightLeg.position.y = -1;
        const rLegGroup = new THREE.Group(); rLegGroup.add(rightLeg); rLegGroup.position.set(0.5, 1, 0);
        charGroup.add(rLegGroup);

        charGroup.userData = { lLeg: lLegGroup, rLeg: rLegGroup, lArm: leftArm, rArm: rightArm };
        return charGroup;
    }

    // Создаем игрока
    const player = createRobloxChar(0x0088FF, 0x228B22);
    player.castShadow = true;
    scene.add(player);

    // --- БОТЫ (Имитация сервера) ---
    const bots = [];
    for(let i=0; i<6; i++) {
        const bot = createRobloxChar(Math.random()*0xffffff, 0x111111);
        bot.position.set((Math.random()-0.5)*40, 0, (Math.random()-0.5)*40);
        bot.userData.speed = 0.03 + Math.random() * 0.04;
        bot.rotation.y = Math.random() * Math.PI * 2;
        scene.add(bot);
        bots.push(bot);
    }

    camera.position.set(0, 5, -8);

    // --- УПРАВЛЕНИЕ ---
    let moveForward = false;
    let walkCycle = 0;
    
    // Сенсорное управление
    const btnMove = document.getElementById('btnMove');
    const btnJump = document.getElementById('btnJump');

    btnMove.addEventListener('touchstart', (e) => { e.preventDefault(); moveForward = true; });
    btnMove.addEventListener('touchend', (e) => { e.preventDefault(); moveForward = false; });
    // Для мышки (тесты на ПК)
    btnMove.addEventListener('mousedown', () => { moveForward = true; });
    btnMove.addEventListener('mouseup', () => { moveForward = false; });

    let isJumping = false;
    let velocityY = 0;

    btnJump.addEventListener('touchstart', (e) => { 
        e.preventDefault(); 
        if(player.position.y <= 0.1) { velocityY = 0.3; isJumping = true; }
    });

    // --- ИГРОВОЙ ЦИКЛ ---
    function animate() {
        requestAnimationFrame(animate);

        // Физика игрока
        if (player.position.y > 0 || velocityY > 0) {
            player.position.y += velocityY;
            velocityY -= 0.015;
        } else {
            player.position.y = 0;
            isJumping = false;
            velocityY = 0;
        }

        // Движение игрока
        if (moveForward) {
            player.translateZ(0.15);
            walkCycle += 0.2;
            // Анимация ходьбы
            player.userData.lLeg.rotation.x = Math.sin(walkCycle);
            player.userData.rLeg.rotation.x = -Math.sin(walkCycle);
            player.userData.lArm.rotation.x = -Math.sin(walkCycle);
            player.userData.rArm.rotation.x = Math.sin(walkCycle);
        } else {
            // Стоим смирно
            player.userData.lLeg.rotation.x = 0;
            player.userData.rLeg.rotation.x = 0;
            player.userData.lArm.rotation.x = 0;
            player.userData.rArm.rotation.x = 0;
        }

        // Камера следует за игроком
        const relativeOffset = new THREE.Vector3(0, 5, -8);
        const cameraOffset = relativeOffset.applyMatrix4(player.matrixWorld);
        camera.position.lerp(cameraOffset, 0.1);
        camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

        // Логика ботов
        bots.forEach(bot => {
            bot.translateZ(bot.userData.speed);
            // Простая анимация
            bot.userData.lLeg.rotation.x = Math.sin(Date.now()*0.005);
            bot.userData.rLeg.rotation.x = -Math.sin(Date.now()*0.005);
            
            // Если бот ушел далеко - разворачиваем
            if(bot.position.length() > 30) {
                bot.lookAt(0, 0, 0);
            }
        });

        renderer.render(scene, camera);
    }
    
    // Адаптация экрана
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}