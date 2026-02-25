// --- КОНФИГУРАЦИЯ ---
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
let salaryTimer = 600;
let collidables = [];
let isRoundSkin = false;
let hasPizzaBox = false; // Несем ли мы пиццу?

// --- АУДИО СИСТЕМА (Синтезатор) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(!document.getElementById('opt-sound').checked) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);

    if (type === 'jump') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'money') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'click') {
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    }
}

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
    if(userData.currency>=price) {
        playSound('money');
        db.ref('users/'+currentUser.uid).update({currency:userData.currency-price, skinColor:color});
    } else alert('Недостаточно R$!');
}
function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(c=>c.style.display='none');
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('tab-'+t).style.display='block';
    if(t==='games') document.querySelectorAll('.tab-btn')[0].classList.add('active');
    else document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function openSettings() { document.getElementById('settings-modal').style.display='flex'; }
function closeSettings() { 
    document.getElementById('settings-modal').style.display='none';
    isRoundSkin = document.getElementById('opt-round-skin').checked;
}

// --- ИГРА ---
function startGame() {
    gameActive = true;
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    workPoints = 0;
    salaryTimer = 600; 
    collidables = [];
    hasPizzaBox = false;
    
    initChat();
    
    const timerInterval = setInterval(() => {
        if(!gameActive) { clearInterval(timerInterval); return; }
        salaryTimer--;
        if(salaryTimer <= 0) {
            const salary = Math.floor(workPoints / 10);
            if(salary > 0) {
                playSound('money');
                db.ref('users/'+currentUser.uid).update({currency: userData.currency + salary});
                alert(`ЗАРПЛАТА! +${salary} R$`);
                workPoints = 0;
            } else alert("Вы не работали!");
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
    playSound('click');
    workPoints += 10;
    document.getElementById('cashier-ui').style.display='none';
    showFloatText("+10 Очков");
    updateHUD();
}
function doSimpleJob(type) {
    playSound('click');
    if (type === 'box') {
        hasPizzaBox = true;
        document.getElementById('delivery-status').style.display = 'block';
        alert("Пицца упакована! Отнеси её в дом в конце улицы.");
    } else if (type === 'delivery') {
        if (hasPizzaBox) {
            hasPizzaBox = false;
            document.getElementById('delivery-status').style.display = 'none';
            workPoints += 50; // Много очков за доставку
            showFloatText("+50 Очков (Доставка)");
            updateHUD();
        } else {
            alert("У тебя нет пиццы!");
        }
    } else {
        workPoints += 10;
        showFloatText("+10 Очков");
        updateHUD();
    }
}
function showFloatText(text) {
    const btn = document.createElement('div');
    btn.innerText = text;
    btn.style.cssText = "position:absolute; top:40%; left:50%; color:gold; font-size:24px; font-weight:bold; transform:translate(-50%,-50%); transition:1s; pointer-events:none; z-index:5000; text-shadow:0 0 5px black;";
    document.body.appendChild(btn);
    setTimeout(() => { btn.style.top="30%"; btn.style.opacity="0"; }, 50);
    setTimeout(() => btn.remove(), 1000);
}
function closeUI(id) { document.getElementById(id).style.display='none'; }
function exitGame() { location.reload(); }

// Чат
function initChat() {
    const msgBox = document.getElementById('chat-messages');
    msgBox.innerHTML = '';
    db.ref('games/pizza/chat').limitToLast(10).on('child_added', s => {
        const d = s.val();
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="chat-name">${d.user}:</span> ${d.text}`;
        msgBox.appendChild(div);
        msgBox.scrollTop = msgBox.scrollHeight;
    });
}
function sendChat() {
    const i = document.getElementById('chat-input');
    if(i.value.trim()) db.ref('games/pizza/chat').push({user:userData.username, text:i.value});
    i.value='';
}

// --- 3D ДВИЖОК ---
function init3D() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = document.getElementById('opt-shadows').checked;
    
    const cont = document.body;
    while(cont.querySelector('canvas')) cont.querySelector('canvas').remove();
    cont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(20,50,20); 
    if(renderer.shadowMap.enabled) dl.castShadow=true; scene.add(dl);

    const interactions = [];

    // Текстура Плитки
    function createCheckerTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#CCCCCC'; ctx.fillRect(0,0,32,32); ctx.fillRect(32,32,32,32);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(10, 10);
        return tex;
    }

    // --- МИР ---
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(300,300), new THREE.MeshStandardMaterial({color:0x33aa33}));
    grass.rotation.x = -Math.PI/2; scene.add(grass);
    
    // Дорога
    const road = new THREE.Mesh(new THREE.PlaneGeometry(20, 300), new THREE.MeshStandardMaterial({color:0x333333}));
    road.rotation.x = -Math.PI/2; road.position.y = 0.01; scene.add(road);

    function createBox(w, h, d, x, z, col=0xF5F5DC, isWall=true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({color:col}));
        mesh.position.set(x, h/2, z);
        if(renderer.shadowMap.enabled) { mesh.castShadow=true; mesh.receiveShadow=true; }
        scene.add(mesh);
        if(isWall) collidables.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }

    // ПИЦЦЕРИЯ
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshStandardMaterial({map: createCheckerTexture()}));
    floor.rotation.x = -Math.PI/2; floor.position.y=0.02; floor.position.x = 40; scene.add(floor);

    // Стены (Сдвинуты вправо на X=40)
    createBox(60, 8, 2, 40, -30); // Зад
    createBox(2, 8, 60, 10, 0); // Лево
    createBox(2, 8, 60, 70, 0);  // Право
    createBox(25, 8, 2, 22.5, 30); // Перед Л
    createBox(25, 8, 2, 57.5, 30);  // Перед П

    // Мебель
    createBox(40, 2, 3, 40, 10, 0xFFFFFF); // Прилавок
    interactions.push({pos: new THREE.Vector3(30,0,13), type:'cashier', radius:6});
    interactions.push({pos: new THREE.Vector3(50,0,13), type:'cashier', radius:6});
    
    createBox(10, 4, 4, 25, -28, 0x111111); // Печь
    interactions.push({pos: new THREE.Vector3(25,0,-24), type:'cook', radius:6, label:"ГОТОВИТЬ"});
    
    createBox(8, 2, 4, 15, -5, 0x8B4513); // Стол упаковки
    interactions.push({pos: new THREE.Vector3(18,0,-5), type:'box', radius:6, label:"УПАКОВАТЬ"});

    // Босс
    createBox(6, 2, 4, 60, -20, 0x550000); // Стол
    createBox(3, 3, 3, 60, -25, 0x000000, false); // Кресло
    interactions.push({pos: new THREE.Vector3(60,0,-25), type:'boss', radius:4, label:"БОСС (+$$$)"});

    // ДОМ (Для доставки) Z=-80
    createBox(20, 10, 20, -30, -80, 0xAA5555); // Дом
    createBox(1, 6, 4, -20, -70, 0x654321); // Дверь
    interactions.push({pos: new THREE.Vector3(-20,0,-65), type:'delivery', radius:6, label:"ОТДАТЬ ПИЦЦУ"});

    // Деревья
    for(let i=0; i<10; i++) {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1,1,6), new THREE.MeshStandardMaterial({color:0x8B4513})); trunk.position.y=3;
        const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(4), new THREE.MeshStandardMaterial({color:0x228B22})); leaves.position.y=7;
        tree.add(trunk, leaves);
        tree.position.set(-20, 0, i*20 - 50);
        scene.add(tree);
    }


    // --- ПЕРСОНАЖ ---
    const player = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({color: 0xFFD700});
    const bodyMat = new THREE.MeshStandardMaterial({color: userData.skinColor});
    const pantsMat = new THREE.MeshStandardMaterial({color: 0x228B22});

    if (isRoundSkin) {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.7), skinMat); head.position.y=3.8;
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2), bodyMat); torso.position.y=2.2;
        const armGeo = new THREE.CapsuleGeometry(0.35, 1.5);
        const lArm = new THREE.Mesh(armGeo, skinMat); lArm.position.set(-1.4, 3, 0);
        const rArm = new THREE.Mesh(armGeo, skinMat); rArm.position.set(1.4, 3, 0);
        const legGeo = new THREE.CapsuleGeometry(0.4, 1.8);
        const lLeg = new THREE.Mesh(legGeo, pantsMat); lLeg.position.set(-0.5, 0.9, 0);
        const rLeg = new THREE.Mesh(legGeo, pantsMat); rLeg.position.set(0.5, 0.9, 0);
        player.add(head, torso, lArm, rArm, lLeg, rLeg);
        player.userData = { la:lArm, ra:rArm, ll:lLeg, rl:rLeg, type:'round' };
    } else {
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

    // СПАВН НА ДОРОГЕ
    player.position.set(0, 5, 80);
    scene.add(player); camera.position.set(0,10,95);

    // УПРАВЛЕНИЕ
    let moveFwd=0, moveTurn=0, vy=0;
    const z = document.getElementById('joystick-zone'); z.innerHTML='';
    joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white', size: 100});
    joystickManager.on('move', (e,d) => {
        moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.15;
        moveTurn = Math.cos(d.angle.radian)*0.08;
    });
    joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
    document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); if(player.position.y<=0.1) { vy=0.3; playSound('jump'); }});

    function resolveCollision(newPos) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(newPos, new THREE.Vector3(1, 2, 1));
        for(let wallBox of collidables) {
            if(playerBox.intersectsBox(wallBox)) return true;
        }
        return false;
    }

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        // UI ОБНОВЛЕНИЕ
        let activeUI = null;
        interactions.forEach(zone => { if(player.position.distanceTo(zone.pos) < zone.radius) activeUI = zone; });

        if (activeUI) {
            if(activeUI.type==='cashier') document.getElementById('cashier-ui').style.display = 'block';
            else if (activeUI.type==='boss') {
                 // Пассивный доход
                 workPoints += 0.2; 
                 updateHUD();
                 document.getElementById('action-btn').style.display='none';
            }
            else {
                document.getElementById('cashier-ui').style.display='none';
                const btn = document.getElementById('action-btn');
                btn.style.display='flex';
                btn.innerText = activeUI.label;
                btn.onclick = () => doSimpleJob(activeUI.type);
            }
        } else {
            document.getElementById('cashier-ui').style.display='none';
            document.getElementById('action-btn').style.display='none';
        }

        // ДВИЖЕНИЕ
        if(moveFwd!==0) {
            const nextPos = player.position.clone();
            nextPos.z += Math.cos(player.rotation.y) * moveFwd;
            nextPos.x += Math.sin(player.rotation.y) * moveFwd;

            if(!resolveCollision(nextPos)) player.position.copy(nextPos);
            player.rotation.y -= moveTurn;
            
            const t = Date.now()*0.015;
            if(player.userData.type === 'round') {
                player.userData.ll.rotation.x = Math.sin(t)*0.5;
                player.userData.rl.rotation.x = -Math.sin(t)*0.5;
            } else {
                player.userData.ll.rotation.x = Math.sin(t);
                player.userData.rl.rotation.x = -Math.sin(t);
            }
        }

        if(player.position.y>0 || vy>0) { player.position.y+=vy; vy-=0.015; }
        else { player.position.y=0; vy=0; }

        const o = new THREE.Vector3(0,7,-10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+3, player.position.z);
        
        renderer.render(scene, camera);
    }
    animate();
}