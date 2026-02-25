// 1. Настройка сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Небо
scene.fog = new THREE.Fog(0x87CEEB, 10, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Сглаживание
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// 2. Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(20, 30, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

// 3. Мир (Спавн)
const floorGeometry = new THREE.PlaneGeometry(200, 200);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44 }); 
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Декорации (Стены/Блоки)
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
createBlock(10, 2, -15, 0x555555);
createBlock(0, 2, -20, 0x0000FF);

// 4. ФУНКЦИЯ СОЗДАНИЯ ПЕРСОНАЖА (ROBLOX STYLE)
function createRobloxChar(colorShirt, colorPants) {
    const character = new THREE.Group();

    // Материалы
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xFFD700 }); // Желтая кожа
    const shirtMat = new THREE.MeshStandardMaterial({ color: colorShirt });
    const pantsMat = new THREE.MeshStandardMaterial({ color: colorPants });

    // Торс
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 1), shirtMat);
    torso.position.y = 2;
    torso.castShadow = true;
    character.add(torso);

    // Голова
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), skinMat);
    head.position.y = 3.6;
    head.castShadow = true;
    character.add(head);

    // Левая рука
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), skinMat);
    leftArm.position.set(-1.5, 2, 0);
    leftArm.castShadow = true;
    character.add(leftArm);

    // Правая рука
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2, 0.8), skinMat);
    rightArm.position.set(1.5, 2, 0);
    rightArm.castShadow = true;
    character.add(rightArm);

    // Левая нога
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
    leftLeg.position.set(-0.5, 0, 0); // Центр ноги
    leftLeg.castShadow = true;
    
    // Группа для анимации ноги (сустав сверху)
    const leftLegGroup = new THREE.Group();
    leftLegGroup.add(leftLeg);
    leftLeg.position.y = -1; // Сдвиг геометрии вниз относительно сустава
    leftLegGroup.position.set(0, 1, 0); // Позиция сустава
    character.add(leftLegGroup);

    // Правая нога
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2, 0.9), pantsMat);
    rightLeg.position.set(0.5, 0, 0);
    rightLeg.castShadow = true;

    const rightLegGroup = new THREE.Group();
    rightLegGroup.add(rightLeg);
    rightLeg.position.y = -1;
    rightLegGroup.position.set(0, 1, 0);
    character.add(rightLegGroup);

    // Сохраним ссылки на конечности для анимации
    character.userData = { leftLeg: leftLegGroup, rightLeg: rightLegGroup, leftArm: leftArm, rightArm: rightArm };

    return character;
}

// СОЗДАЕМ ИГРОКА
const player = createRobloxChar(0x0088FF, 0x228B22); // Синяя майка, зеленые штаны
scene.add(player);

// 5. ИМИТАЦИЯ СЕРВЕРА (БОТЫ)
const bots = [];
const botCount = 5; // Сколько ботов на сервере

for(let i=0; i<botCount; i++) {
    // Случайные цвета для ботов
    const randomColor = Math.random() * 0xffffff;
    const bot = createRobloxChar(randomColor, 0x333333);
    
    // Случайная позиция
    bot.position.set((Math.random() - 0.5) * 40, 0, (Math.random() - 0.5) * 40);
    bot.rotation.y = Math.random() * Math.PI * 2;
    
    // Данные для логики бота
    bot.userData.speed = 0.05 + Math.random() * 0.05;
    bot.userData.turnTimer = 0;
    
    scene.add(bot);
    bots.push(bot);
}

// Позиция камеры
camera.position.set(0, 5, -8);

// Управление
let moveForward = false;
let isJumping = false;
let velocityY = 0;
let walkCycle = 0; // Для анимации ходьбы

const btnMove = document.getElementById('btnMove');
const btnJump = document.getElementById('btnJump');

// Кнопки
btnMove.addEventListener('touchstart', (e) => { e.preventDefault(); moveForward = true; });
btnMove.addEventListener('touchend', (e) => { e.preventDefault(); moveForward = false; });
btnMove.addEventListener('mousedown', (e) => { moveForward = true; }); // Для ПК тестов
btnMove.addEventListener('mouseup', (e) => { moveForward = false; });

btnJump.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    if (player.position.y <= 0.1) { 
        velocityY = 0.3; 
        isJumping = true; 
    }
});

function animatePlayer() {
    // Гравитация
    if (player.position.y > 0 || velocityY > 0) {
        player.position.y += velocityY;
        velocityY -= 0.015;
    } else {
        player.position.y = 0;
        isJumping = false;
        velocityY = 0;
    }

    // Движение и анимация
    if (moveForward) {
        player.translateZ(0.15); // Идти вперед
        walkCycle += 0.2;
        
        // Машем руками и ногами
        player.userData.leftLeg.rotation.x = Math.sin(walkCycle) * 0.5;
        player.userData.rightLeg.rotation.x = -Math.sin(walkCycle) * 0.5;
        player.userData.leftArm.rotation.x = -Math.sin(walkCycle) * 0.5;
        player.userData.rightArm.rotation.x = Math.sin(walkCycle) * 0.5;
    } else {
        // Сброс позы
        player.userData.leftLeg.rotation.x = 0;
        player.userData.rightLeg.rotation.x = 0;
        player.userData.leftArm.rotation.x = 0;
        player.userData.rightArm.rotation.x = 0;
    }

    // Камера плавно летит за спиной
    const relativeCameraOffset = new THREE.Vector3(0, 5, -8);
    const cameraOffset = relativeCameraOffset.applyMatrix4(player.matrixWorld);
    camera.position.lerp(cameraOffset, 0.1);
    camera.lookAt(player.position.x, player.position.y + 2, player.position.z);
}

function animateBots() {
    bots.forEach(bot => {
        // Бот просто идет вперед
        bot.translateZ(bot.userData.speed);
        
        // Анимация бота
        bot.userData.leftLeg.rotation.x = Math.sin(Date.now() * 0.01) * 0.5;
        bot.userData.rightLeg.rotation.x = -Math.sin(Date.now() * 0.01) * 0.5;

        // Логика поворота
        bot.userData.turnTimer++;
        if(bot.userData.turnTimer > 100) {
            bot.rotation.y += (Math.random() - 0.5) * 2; // Поворот
            bot.userData.turnTimer = 0;
        }

        // Если бот ушел далеко, развернем его к центру
        if(bot.position.distanceTo(new THREE.Vector3(0,0,0)) > 40) {
            bot.lookAt(0,0,0);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    animatePlayer();
    animateBots();
    renderer.render(scene, camera);
}

// Ресайз
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();