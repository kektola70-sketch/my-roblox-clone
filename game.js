// --- КОНФИГ ---
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
let workPoints = 0;
let salaryTimer = 600; // 10 минут (600 сек)
let collidables = []; // Стены и мебель (Хитбоксы)
let isRoundSkin = false; // Настройка скина

// --- АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('loading-text').style.display='none';
        db.ref('users/' + user.uid).on('value', snap => {
            userData = snap.val() || userData;
            updateMenu();
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
        db.ref('users/'+c.user.uid).set({username:n, currency:100, skinColor:"#0000FF"});
    }).catch(e=>alert(e.message)); 
}
function logout() { auth.signOut(); location.reload(); }

// --- МЕНЮ ---
function updateMenu() {
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('dashboard').style.display='flex';
    document.getElementById('dash-username').innerText = userData.username;
    document.getElementById('dash-money').innerText = userData.currency;
    document.getElementById('dash-avatar').innerText = userData.username[0];
    
    // Магазин
    const items = [ {c:"#0000FF",p:0,n:"Синий"}, {c:"#FF0000",p:50,n:"Красный"}, {c:"#000000",p:100,n:"Черный"}, {c:"#FFFFFF",p:200,n:"Белый"} ];
    const list = document.getElementById('shop-list'); list.innerHTML='';
    items.forEach(i => {
        const owned = userData.skinColor === i.c;
        list.innerHTML += `<div class="shop-item">
            <div style="height:40px;background:${i.c};margin-bottom:5px;"></div>
            <b>${i.n}</b>
            <button class="btn-buy" onclick="${owned?'':`buy('${i.c}',${i.p})`}">${owned?'КУПЛЕНО':i.p+' R$'}</button>
        </div>`;
    });
}
function buy(color, price) {
    if(userData.currency>=price) db.ref('users/'+currentUser.uid).update({currency:userData.currency-price, skinColor:color});
    else alert('Недостаточно R$!');
}
function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none');
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+t).style.display='block';
    // Простая логика подсветки
    if(t==='games') document.querySelectorAll('.tab-btn')[0].classList.add('active');
    else document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

// Настройки
function openSettings() { document.getElementById('settings-modal').style.display='flex'; }
function closeSettings() { 
    document.getElementById('settings-modal').style.display='none';
    isRoundSkin = document.getElementById('opt-round-skin').checked;
}

// --- ИГРА: ПИЦЦЕРИЯ ---
function startGame() {
    gameActive = true;
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    workPoints = 0;
    salaryTimer = 600; 
    collidables = [];
    
    // Таймер Зарплаты
    const timerInterval = setInterval(() => {
        if(!gameActive) { clearInterval(timerInterval); return; }
        salaryTimer--;
        if(salaryTimer <= 0) {
            const salary = Math.floor(workPoints / 10); // 10 очков = 1 R$
            if(salary > 0) {
                db.ref('users/'+currentUser.uid).update({currency: userData.currency + salary});
                alert(`ЗАРПЛАТА! Вы заработали ${salary} R$`);
                workPoints = 0;
            } else {
                alert("Зарплата пришла, но вы не работали!");
            }
            salaryTimer = 600;
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

// Работа
function doJob(type) {
    workPoints += 10;
    document.getElementById('cashier-ui').style.display='none';
    // Эффект всплывающего текста
    const btn = document.createElement('div');
    btn.innerText = "+10 Очков";
    btn.style.cssText = "position:absolute; top:40%; left:50%; color:gold; font-size:24px; font-weight:bold; transform:translate(-50%,-50%); transition:1s;";
    document.body.appendChild(btn);
    setTimeout(() => { btn.style.top="30%"; btn.style.opacity="0"; }, 50);
    setTimeout(() => btn.remove(), 1000);
    updateHUD();
}
function doSimpleJob() { doJob('work'); }
function closeUI(id) { document.getElementById(id).style.display='none'; }
function exitGame() { location.reload(); }

// --- 3D ДВИЖОК ---
function init3D() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = document.getElementById('opt-shadows').checked;
    document.body.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(20,50,20); 
    if(renderer.shadowMap.enabled) dl.castShadow=true; scene.add(dl);

    // Зоны взаимодействия
    const interactions = [];

    // --- СТРОИТЕЛЬСТВО ПИЦЦЕРИИ ---
    
    // Трава (Улица)
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x33aa33}));
    grass.rotation.x = -Math.PI/2; scene.add(grass);

    // Функция Стены (С Хитбоксом)
    function createBox(w, h, d, x, z, col=0xF5F5DC, isWall=true) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({color:col});
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h/2, z);
        if(renderer.shadowMap.enabled) { mesh.castShadow=true; mesh.receiveShadow=true; }
        scene.add(mesh);
        if(isWall) collidables.push(new THREE.Box3().setFromObject(mesh)); // Добавляем в коллизию
        return mesh;
    }

    // Пол здания (Плитка)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshStandardMaterial({color:0xCCCCCC}));
    floor.rotation.x = -Math.PI/2; floor.position.y=0.02; scene.add(floor);

    // Внешние стены (Высота 8, Оставляем дырку для двери)
    createBox(60, 8, 2, 0, -30); // Задняя
    createBox(2, 8, 60, -30, 0); // Левая
    createBox(2, 8, 60, 30, 0);  // Правая
    createBox(25, 8, 2, -17.5, 30); // Передняя Левая
    createBox(25, 8, 2, 17.5, 30);  // Передняя Правая
    
    // Внутренние стены (Разделение комнат)
    // 1. Стена между Залом и Кухней
    createBox(60, 8, 2, 0, 0, 0xEEDDCC);
    // Проход на кухню (Дырка в стене - просто не ставим блок посередине)
    
    // 2. Стена Менеджера (Справа сзади)
    createBox(2, 8, 20, 15, -20, 0xEEDDCC);
    createBox(15, 8, 2, 22.5, -10, 0xEEDDCC);

    // --- МЕБЕЛЬ (ТОЖЕ ХИТБОКСЫ) ---
    
    // Прилавок (Спереди) - 2 Кассы
    createBox(40, 2, 3, 0, 10, 0xFFFFFF); // Длинный прилавок
    
    // Касса 1
    createBox(2, 1, 2, -10, 11.5, 0x333333, false);
    interactions.push({pos: new THREE.Vector3(-10,0,13), type:'cashier', radius:4});
    // Касса 2
    createBox(2, 1, 2, 10, 11.5, 0x333333, false);
    interactions.push({pos: new THREE.Vector3(10,0,13), type:'cashier', radius:4});

    // Кухня (Печи)
    createBox(10, 4, 4, -15, -28, 0x111111); // Печь 1
    interactions.push({pos: new THREE.Vector3(-15,0,-24), type:'cook', radius:5, label:"ГОТОВИТЬ"});
    
    // Упаковка (Стол с коробками)
    createBox(8, 2, 4, -25, -5, 0x8B4513); // Стол
    createBox(2, 1, 2, -25, -2, 0xFFFFFF, false); // Коробка
    interactions.push({pos: new THREE.Vector3(-22,0,-5), type:'box', radius:4, label:"УПАКОВАТЬ"});

    // Стол менеджера
    createBox(6, 2, 4, 25, -25, 0x552200); 

    // --- ПЕРСОНАЖ ---
    const player = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({color: 0xFFD700});
    const bodyMat = new THREE.MeshStandardMaterial({color: userData.skinColor});
    const pantsMat = new THREE.MeshStandardMaterial({color: 0x228B22});

    if (isRoundSkin) {
        // Округлый скин (R15 style)
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.7), skinMat); head.position.y=3.8;
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2), bodyMat); torso.position.y=2.2;
        
        // Плечи и руки
        const armGeo = new THREE.CapsuleGeometry(0.35, 1.5);
        const lArm = new THREE.Mesh(armGeo, skinMat); lArm.position.set(-1.4, 3, 0);
        const rArm = new THREE.Mesh(armGeo, skinMat); rArm.position.set(1.4, 3, 0);
        
        // Ноги
        const legGeo = new THREE.CapsuleGeometry(0.4, 1.8);
        const lLeg = new THREE.Mesh(legGeo, pantsMat); lLeg.position.set(-0.5, 0.9, 0);
        const rLeg = new THREE.Mesh(legGeo, pantsMat); rLeg.position.set(0.5, 0.9, 0);

        player.add(head, torso, lArm, rArm, lLeg, rLeg);
        player.userData = { la:lArm, ra:rArm, ll:lLeg, rl:rLeg, type:'round' };
    } else {
        // Квадратный скин (R6 style)
        const head = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,1.2), skinMat); head.position.y=4.6;
        const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), bodyMat); torso.position.y=3;
        
        const armGeo = new THREE.BoxGeometry(1,2,1);
        const lArm = new THREE.Mesh(armGeo, skinMat); lArm.position.set(-1.5,3,0);
        const rArm = new THREE.Mesh(armGeo, skinMat); rArm.position.set(1.5,3,0);
        
        const legGeo = new THREE.BoxGeometry(1,2,1);
        const lLeg = new THREE.Mesh(legGeo, pantsMat); lLeg.position.set(-0.5,1,0);
        const rLeg = new THREE.Mesh(legGeo, pantsMat); rLeg.position.set(0.5,1,0);

        player.add(head, torso, lArm, rArm, lLeg, rLeg);
        player.userData = { la:lArm, ra:rArm, ll:lLeg, rl:rLeg, type:'box' };
    }

    scene.add(player); camera.position.set(0,8,20); // Начало на улице перед входом

    // --- NPC (ПОСЕТИТЕЛИ) ---
    const npcs = [];
    function createNPC() {
        const npc = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({color: Math.random()*0xffffff});
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,2), mat); b.position.y=1;
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({color:0xffd700})); h.position.y=2.2;
        npc.add(b,h);
        npc.position.set((Math.random()-0.5)*10, 0, 40); // Спавн на улице
        scene.add(npc);
        npcs.push({mesh:npc, target: new THREE.Vector3((Math.random()-0.5)*10, 0, 14), state:'walking'}); // Идут к кассам
    }
    // Создаем 3 NPC
    createNPC(); createNPC(); createNPC();

    // --- УПРАВЛЕНИЕ ---
    let moveFwd=0, moveTurn=0, vy=0;
    const z = document.getElementById('joystick-zone'); z.innerHTML='';
    joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white', size: 100});
    joystickManager.on('move', (e,d) => {
        moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.15;
        moveTurn = Math.cos(d.angle.radian)*0.08;
    });
    joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
    document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); if(player.position.y<=0.1) vy=0.3;});

    // ФИЗИКА КОЛЛИЗИЙ (СТЕНЫ)
    function resolveCollision(newPos) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(newPos, new THREE.Vector3(1, 2, 1));
        for(let wallBox of collidables) {
            if(playerBox.intersectsBox(wallBox)) {
                return true; // Столкновение!
            }
        }
        return false; // Путь свободен
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        // Расчет движения
        if(moveFwd!==0) {
            // Пробуем шагнуть вперед
            const nextPos = player.position.clone();
            nextPos.z += Math.cos(player.rotation.y) * moveFwd;
            nextPos.x += Math.sin(player.rotation.y) * moveFwd;

            if(!resolveCollision(nextPos)) {
                player.position.copy(nextPos);
            }
            player.rotation.y -= moveTurn;
            
            // Анимация
            const t = Date.now()*0.015;
            if(player.userData.type === 'round') {
                player.userData.ll.rotation.x = Math.sin(t)*0.5;
                player.userData.rl.rotation.x = -Math.sin(t)*0.5;
            } else {
                player.userData.ll.rotation.x = Math.sin(t);
                player.userData.rl.rotation.x = -Math.sin(t);
            }
        }

        // Гравитация
        if(player.position.y>0 || vy>0) { player.position.y+=vy; vy-=0.015; }
        else { player.position.y=0; vy=0; }

        // Логика NPC
        npcs.forEach(bot => {
            if(bot.state === 'walking') {
                const dir = new THREE.Vector3().subVectors(bot.target, bot.mesh.position).normalize();
                bot.mesh.position.add(dir.multiplyScalar(0.03));
                if(bot.mesh.position.distanceTo(bot.target) < 1) {
                    bot.state = 'waiting';
                    setTimeout(() => {
                        bot.target.set((Math.random()-0.5)*40, 0, 40 + Math.random()*10); // Уходят
                        bot.state = 'walking';
                    }, 5000);
                }
            }
        });

        // Проверка Работы (Зоны)
        let activeUI = null;
        interactions.forEach(zone => {
            if(player.position.distanceTo(zone.pos) < zone.radius) activeUI = zone;
        });

        if (activeUI) {
            if(activeUI.type==='cashier') document.getElementById('cashier-ui').style.display = 'block';
            else {
                document.getElementById('cashier-ui').style.display='none';
                const btn = document.getElementById('action-btn');
                btn.style.display='flex';
                btn.innerText = activeUI.label;
            }
        } else {
            document.getElementById('cashier-ui').style.display='none';
            document.getElementById('action-btn').style.display='none';
        }

        // Камера
        const o = new THREE.Vector3(0,7,-10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+3, player.position.z);
        
        renderer.render(scene, camera);
    }
    animate();
}