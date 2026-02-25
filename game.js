// --- FIREBASE ---
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
let userData = { username: "Guest", currency: 0, skinColor: "#0000FF" };
let gameActive = false;
let joystickManager = null;
let workPoints = 0; // Зарплата (Очки)
let salaryTimer = 1200; // 20 минут в секундах (поставим меньше для теста, но можно 1200)

// --- АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('loading-text').style.display='none';
        db.ref('users/' + user.uid).on('value', snap => {
            userData = snap.val() || userData;
            updateMenuUI();
        });
    } else {
        document.getElementById('loading-text').style.display='none';
        document.getElementById('auth-forms').style.display='block';
    }
});

function login() { auth.signInWithEmailAndPassword(document.getElementById('email').value, document.getElementById('password').value).catch(e=>alert(e.message)); }
function register() { 
    const n = document.getElementById('username').value;
    auth.createUserWithEmailAndPassword(document.getElementById('email').value, document.getElementById('password').value).then(c => {
        db.ref('users/'+c.user.uid).set({username:n, currency:0, skinColor:"#0000FF"});
    }).catch(e=>alert(e.message)); 
}
function logout() { auth.signOut(); location.reload(); }

// --- МЕНЮ И МАГАЗИН ---
function updateMenuUI() {
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('dashboard').style.display='flex';
    document.getElementById('dash-username').innerText = userData.username;
    document.getElementById('dash-money').innerText = userData.currency;
    document.getElementById('dash-avatar').innerText = userData.username[0];
    
    // Магазин
    const items = [ {c:"#0000FF",p:0,n:"Blue"}, {c:"#FF0000",p:50,n:"Red"}, {c:"#000000",p:100,n:"Black"} ];
    const list = document.getElementById('shop-list'); list.innerHTML='';
    items.forEach(i => {
        const owned = userData.skinColor === i.c;
        list.innerHTML += `<div class="shop-item">
            <div style="height:40px;background:${i.c};margin-bottom:5px;"></div>
            <b>${i.n}</b>
            <button class="btn-buy" onclick="${owned?'':`buy('${i.c}',${i.p})`}">${owned?'OWNED':i.p+' R$'}</button>
        </div>`;
    });
}
function buy(color, price) {
    if(userData.currency>=price) db.ref('users/'+currentUser.uid).update({currency:userData.currency-price, skinColor:color});
    else alert('Need more money!');
}

// --- ИГРА: PIZZA WORK ---
function startGame() {
    gameActive = true;
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    workPoints = 0;
    salaryTimer = 20 * 60; // 20 минут (1200 сек)
    updateHUD();
    
    // Запускаем таймер зарплаты
    setInterval(() => {
        if(!gameActive) return;
        salaryTimer--;
        if(salaryTimer <= 0) {
            // Выплата зарплаты!
            const salary = Math.floor(workPoints / 100); // 100 очков = 1 R$
            if(salary > 0) {
                db.ref('users/'+currentUser.uid).update({currency: userData.currency + salary});
                alert(`PAYCHECK! You earned ${salary} R$`);
                workPoints = 0;
            } else {
                alert("Paycheck! You didn't work enough.");
            }
            salaryTimer = 20 * 60;
        }
        updateHUD();
    }, 1000);

    init3D();
}

function updateHUD() {
    document.getElementById('game-score').innerText = workPoints;
    const m = Math.floor(salaryTimer/60);
    const s = salaryTimer % 60;
    document.getElementById('pay-timer').innerText = `${m}:${s<10?'0'+s:s}`;
}

function doJob(type) {
    // Работа кассира
    workPoints += 10;
    alert("Order taken: " + type + " (+10 pts)");
    document.getElementById('cashier-ui').style.display='none';
    updateHUD();
}

function doSimpleJob() {
    // Повар / Упаковщик
    workPoints += 10;
    // Анимация текста
    const btn = document.getElementById('action-btn');
    const prevText = btn.innerText;
    btn.innerText = "+10 pts";
    setTimeout(()=>btn.innerText=prevText, 500);
    updateHUD();
}

function closeUI(id) { document.getElementById(id).style.display='none'; }
function exitGame() { location.reload(); }

// --- 3D МИР ---
function init3D() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(20,50,10); dl.castShadow=true; scene.add(dl);

    // --- ПОСТРОЙКА ПИЦЦЕРИИ ---
    const walls = [];
    const interactions = []; // Зоны для работы

    // Пол (Трава)
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x44aa44}));
    grass.rotation.x = -Math.PI/2; scene.add(grass);

    // Пол (Пиццерия)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40,30), new THREE.MeshStandardMaterial({color:0xaaaaaa})); // Серый бетон
    floor.rotation.x = -Math.PI/2; floor.position.y=0.01; scene.add(floor);

    // Функция создания стены
    function createWall(w, h, d, x, z, col=0xaa4444) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color:col}));
        mesh.position.set(x, h/2, z); mesh.castShadow=true; mesh.receiveShadow=true;
        scene.add(mesh); walls.push(mesh);
    }

    // Стены здания
    createWall(40, 6, 1, 0, -15); // Задняя
    createWall(1, 6, 30, -20, 0); // Левая
    createWall(1, 6, 30, 20, 0);  // Правая
    createWall(15, 6, 1, -12.5, 15); // Передняя левая
    createWall(15, 6, 1, 12.5, 15);  // Передняя правая (Вход по центру пустой)

    // Прилавки и оборудование
    // 1. КАССА (Спереди)
    const register = new THREE.Mesh(new THREE.BoxGeometry(6, 1.5, 2), new THREE.MeshStandardMaterial({color:0xffffff}));
    register.position.set(5, 0.75, 5); scene.add(register);
    const regMachine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1), new THREE.MeshStandardMaterial({color:0x333333}));
    regMachine.position.set(5, 1.7, 5); scene.add(regMachine);
    interactions.push({ pos: new THREE.Vector3(5,0,7), type: 'cashier', radius: 4 });

    // 2. ПЕЧИ (Сзади)
    const oven = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 3), new THREE.MeshStandardMaterial({color:0x222222}));
    oven.position.set(-10, 1.5, -12); scene.add(oven);
    interactions.push({ pos: new THREE.Vector3(-10,0,-9), type: 'cook', radius: 4 });

    // 3. СТОЛ УПАКОВКИ (Слева)
    const table = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 6), new THREE.MeshStandardMaterial({color:0x8B4513}));
    table.position.set(-17, 0.75, 0); scene.add(table);
    // Коробки на столе
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshStandardMaterial({color:0xffffff}));
    box.position.set(-17, 1.6, 0); scene.add(box);
    interactions.push({ pos: new THREE.Vector3(-14,0,0), type: 'box', radius: 4 });


    // --- ПЕРСОНАЖ (С РУКАМИ И НОГАМИ) ---
    const player = new THREE.Group();
    // Тело
    const bodyMat = new THREE.MeshStandardMaterial({color: userData.skinColor}); // Цвет из магазина
    const skinMat = new THREE.MeshStandardMaterial({color: 0xFFD700}); // Желтая кожа
    const legsMat = new THREE.MeshStandardMaterial({color: 0x228B22}); // Зеленые штаны

    const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), skinMat); head.position.y=3.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), bodyMat); torso.position.y=2;
    
    // Группы для анимации конечностей
    const lLegG = new THREE.Group(); 
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), legsMat); lLeg.position.y=-1; 
    lLegG.add(lLeg); lLegG.position.set(-0.5,1,0);

    const rLegG = new THREE.Group(); 
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), legsMat); rLeg.position.y=-1; 
    rLegG.add(rLeg); rLegG.position.set(0.5,1,0);

    const lArmG = new THREE.Group(); 
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), skinMat); lArm.position.y=-1; 
    lArmG.add(lArm); lArmG.position.set(-1.5,3,0);

    const rArmG = new THREE.Group(); 
    const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), skinMat); rArm.position.y=-1; 
    rArmG.add(rArm); rArmG.position.set(1.5,3,0);

    player.add(head, torso, lLegG, rLegG, lArmG, rArmG);
    player.userData = { lg:lLegG, rg:rLegG, la:lArmG, ra:rArmG };
    scene.add(player); camera.position.set(0,8,-12);

    // УПРАВЛЕНИЕ
    let moveFwd=0, moveTurn=0;
    const z = document.getElementById('joystick-zone'); z.innerHTML='';
    joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white'});
    joystickManager.on('move', (e,d) => {
        moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.1;
        moveTurn = Math.cos(d.angle.radian)*0.08;
    });
    joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});

    let vy=0;
    document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); if(player.position.y<=0.1) vy=0.3;});


    // --- ИГРОВОЙ ЦИКЛ ---
    function checkInteractions() {
        let activeZone = null;
        interactions.forEach(zone => {
            if(player.position.distanceTo(zone.pos) < zone.radius) {
                activeZone = zone.type;
            }
        });

        const cashierUI = document.getElementById('cashier-ui');
        const actionBtn = document.getElementById('action-btn');

        // Логика UI
        if (activeZone === 'cashier') {
            if(cashierUI.style.display === 'none') cashierUI.style.display = 'block';
            actionBtn.style.display = 'none';
        } else if (activeZone === 'cook') {
            cashierUI.style.display = 'none';
            actionBtn.style.display = 'flex';
            actionBtn.innerText = "COOK";
        } else if (activeZone === 'box') {
            cashierUI.style.display = 'none';
            actionBtn.style.display = 'flex';
            actionBtn.innerText = "BOX";
        } else {
            // Если отошли
            cashierUI.style.display = 'none';
            actionBtn.style.display = 'none';
        }
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        // Движение
        if(moveFwd!==0) {
            player.translateZ(moveFwd);
            player.rotation.y -= moveTurn;
            const t = Date.now()*0.015;
            player.userData.lg.rotation.x = Math.sin(t);
            player.userData.rg.rotation.x = -Math.sin(t);
            player.userData.la.rotation.x = -Math.sin(t);
            player.userData.ra.rotation.x = Math.sin(t);
        } else {
            player.userData.lg.rotation.x=0; player.userData.rg.rotation.x=0;
            player.userData.la.rotation.x=0; player.userData.ra.rotation.x=0;
        }

        // Гравитация
        if(player.position.y>0 || vy>0) { player.position.y+=vy; vy-=0.015; }
        else { player.position.y=0; vy=0; }

        // Проверка работы
        checkInteractions();

        // Камера
        const o = new THREE.Vector3(0,7,-10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+2, player.position.z);
        
        renderer.render(scene, camera);
    }
    animate();
}