// --- ЧАСТЬ 1: СЕРВЕР И ВХОД ---

// ВСТАВЬ СЮДА КОНФИГ ИЗ FIREBASE (Шаг 1, пункт 10)
// Примерно так это должно выглядеть:
const firebaseConfig = {
    apiKey: "AIzaSyB_1fSgljQJV73dVAt1H-Atvr4j1MGJDiA",
    authDomain: "pocketblox-e1290.firebaseapp.com",
    databaseURL: "https://pocketblox-e1290-default-rtdb.firebaseio.com",
    projectId: "pocketblox-e1290",
    storageBucket: "pocketblox-e1290.firebasestorage.app",
    messagingSenderId: "611510454197",
    appId: "1:611510454197:web:7c1b2ee43060ea44863bfc"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const statusMsg = document.getElementById('status-msg');

// Функция Регистрации
function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;

    if(!username) { statusMsg.innerText = "Введите никнейм!"; return; }

    statusMsg.innerText = "Проверка данных...";
    
    // Создаем пользователя на сервере
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Сохраняем Никнейм в базу данных
            db.ref('users/' + user.uid).set({
                username: username,
                email: email
            });
            statusMsg.innerText = "Аккаунт создан! Входим...";
            startGame(username); // Запуск игры
        })
        .catch((error) => {
            statusMsg.innerText = "Ошибка: " + error.message;
        });
}

// Функция Входа
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    statusMsg.innerText = "Проверка аккаунта...";

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Получаем никнейм с сервера
            db.ref('users/' + user.uid).once('value').then((snapshot) => {
                const data = snapshot.val();
                const name = data ? data.username : "Игрок";
                statusMsg.innerText = "Успешный вход!";
                startGame(name); // Запуск игры
            });
        })
        .catch((error) => {
            statusMsg.innerText = "Ошибка: Аккаунт не найден или пароль неверный.";
        });
}


// --- ЧАСТЬ 2: САМА ИГРА (Three.js) ---
// Этот код запустится только после успешного входа

function startGame(playerName) {
    // 1. Скрываем меню, показываем игру
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('player-name').innerText = playerName;

    // 2. Инициализация 3D мира (Весь код из прошлого урока)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Свет
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Пол
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x44aa44 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Функция создания персонажа
    function createRobloxChar(colorShirt, colorPants) {
        const charGroup = new THREE.Group();
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        const shirtMat = new THREE.MeshStandardMaterial({ color: colorShirt });
        const pantsMat = new THREE.MeshStandardMaterial({ color: colorPants });

        const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
        torso.position.y = 2; charGroup.add(torso);
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat);
        head.position.y = 3.6; charGroup.add(head);

        const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
        leftLeg.position.y = -1;
        const lLegGroup = new THREE.Group(); lLegGroup.add(leftLeg); lLegGroup.position.set(-0.5, 1, 0);
        charGroup.add(lLegGroup);

        const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
        rightLeg.position.y = -1;
        const rLegGroup = new THREE.Group(); rLegGroup.add(rightLeg); rLegGroup.position.set(0.5, 1, 0);
        charGroup.add(rLegGroup);

        charGroup.userData = { lLeg: lLegGroup, rLeg: rLegGroup };
        return charGroup;
    }

    // Игрок
    const player = createRobloxChar(0x0088FF, 0x228B22);
    player.castShadow = true;
    scene.add(player);

    // Боты (чтобы не было скучно)
    const bots = [];
    for(let i=0; i<5; i++) {
        const bot = createRobloxChar(Math.random()*0xffffff, 0x333333);
        bot.position.set((Math.random()-0.5)*30, 0, (Math.random()-0.5)*30);
        scene.add(bot);
        bots.push(bot);
    }

    camera.position.set(0, 5, -8);
    let moveForward = false;
    let walkCycle = 0;

    // Управление
    const btnMove = document.getElementById('btnMove');
    btnMove.addEventListener('touchstart', (e) => { e.preventDefault(); moveForward = true; });
    btnMove.addEventListener('touchend', (e) => { e.preventDefault(); moveForward = false; });
    btnMove.addEventListener('mousedown', () => { moveForward = true; }); // Для теста на пк
    btnMove.addEventListener('mouseup', () => { moveForward = false; });

    // Анимация
    function animate() {
        requestAnimationFrame(animate);

        // Игрок
        if (moveForward) {
            player.translateZ(0.15);
            walkCycle += 0.2;
            player.userData.lLeg.rotation.x = Math.sin(walkCycle);
            player.userData.rLeg.rotation.x = -Math.sin(walkCycle);
        } else {
            player.userData.lLeg.rotation.x = 0;
            player.userData.rLeg.rotation.x = 0;
        }

        // Камера
        const relativeOffset = new THREE.Vector3(0, 5, -8);
        const cameraOffset = relativeOffset.applyMatrix4(player.matrixWorld);
        camera.position.lerp(cameraOffset, 0.1);
        camera.lookAt(player.position.x, player.position.y + 2, player.position.z);

        // Боты
        bots.forEach(bot => {
            bot.translateZ(0.05);
            bot.rotation.y += 0.01;
        });

        renderer.render(scene, camera);
    }
    
    // Ресайз
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}