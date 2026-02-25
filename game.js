// 1. Настройка сцены
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Небо
scene.fog = new THREE.Fog(0x87CEEB, 10, 50);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Включаем тени
document.body.appendChild(renderer.domElement);

// 2. Свет
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// 3. Мир (Земля)
const floorGeometry = new THREE.PlaneGeometry(100, 100);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44 }); // Трава
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Добавим несколько блоков (декорации)
function createBlock(x, z) {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xA52A2A }); // Коричневый
    const block = new THREE.Mesh(geo, mat);
    block.position.set(x, 1, z);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);
}
createBlock(-5, -5);
createBlock(5, -5);
createBlock(0, -8);

// 4. Персонаж (Простой кубик - "Нуб")
const playerGeo = new THREE.BoxGeometry(1, 2, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xFFFF00 }); // Желтый
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 1;
player.castShadow = true;
scene.add(player);

// Позиция камеры относительно игрока
camera.position.set(0, 5, 5);
camera.lookAt(player.position);

// 5. Управление
let moveForward = false;
let isJumping = false;
let velocityY = 0;

// Кнопки на экране
const btnMove = document.getElementById('btnMove');
const btnJump = document.getElementById('btnJump');

// Логика нажатий (Touch)
btnMove.addEventListener('touchstart', (e) => { e.preventDefault(); moveForward = true; });
btnMove.addEventListener('touchend', (e) => { e.preventDefault(); moveForward = false; });

btnJump.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    if (player.position.y <= 1) { // Прыгаем только если на земле
        velocityY = 0.2;
        isJumping = true;
    }
});

// 6. Игровой цикл (обновление кадров)
function animate() {
    requestAnimationFrame(animate);

    // Движение вперед
    if (moveForward) {
        player.position.z -= 0.1;
    }

    // Гравитация и прыжки
    if (isJumping || player.position.y > 1) {
        player.position.y += velocityY;
        velocityY -= 0.01; // Гравитация
    }

    // Приземление
    if (player.position.y < 1) {
        player.position.y = 1;
        isJumping = false;
        velocityY = 0;
    }

    // Камера следует за игроком
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 5;
    camera.lookAt(player.position.x, player.position.y, player.position.z);

    renderer.render(scene, camera);
}

// Адаптация под размер экрана
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();