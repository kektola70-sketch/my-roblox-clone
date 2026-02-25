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
    const rightArm = new THREE.Mesh(new