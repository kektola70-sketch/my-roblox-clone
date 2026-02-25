// --- КОНФИГУРАЦИЯ FIREBASE ---
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
    if(t==='games') document.querySelectorAll('.tab-btn')[0].classList.add('active');
    else document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function openSettings() { document.getElementById('settings-modal').style.display='flex'; }
function closeSettings() { 
    document.getElementById('settings-modal').style.display='none';
    isRoundSkin = document.getElementById('opt-round-skin').checked;
}

// --- ЗАПУСК ИГРЫ ---
function startGame() {
    gameActive = true;
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    workPoints = 0;
    salaryTimer = 600; 
    collidables = [];
    
    initChat();
    
    const timerInterval = setInterval(() => {
        if(!gameActive) { clearInterval(timerInterval); return; }
        salaryTimer--;
        if(salaryTimer <= 0) {
            const salary = Math.floor(workPoints / 10);
            if(salary > 0) {
                db.ref('users/'+currentUser.uid).update({currency: userData.currency + salary});
                alert(`ЗАРПЛАТА! +${salary} R$`);
                workPoints = 0;
            } else alert("Нет работы - нет зарплаты!");
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
    showFloatText("+10 Очков");
    updateHUD();
}
function doSimpleJob() { doJob('work'); }

function showFloatText(text) {
    const btn = document.createElement('div');
    btn.innerText = text;
    btn.style.cssText = "position:absolute; top:40%; left:50%; color:gold; font-size:24px; font-weight:bold; transform:translate(-50%,-50%); transition:1s; pointer-events:none; z-index:5000;";
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

    // --- МИР ---
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({color:0x33aa33}));
    grass.rotation.x = -Math.PI/2; scene.add(grass);

    function createBox(w, h, d, x, z, col=0xF5F5DC, isWall=true) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({color:col}));
        mesh.position.set(x, h/2, z);
        if(renderer.shadowMap.enabled) { mesh.castShadow=true; mesh.receiveShadow=true; }
        scene.add(mesh);
        if(isWall) collidables.push(new THREE.Box3().setFromObject(mesh));
        return mesh;
    }

    // Пиццерия
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60,60), new THREE.MeshStandardMaterial({color:0xCCCCCC}));
    floor.rotation.x = -Math.PI/2; floor.position.y=0.02; scene.add(floor);

    // Стены
    createBox(60, 8, 2, 0, -30); // Зад
    createBox(2, 8, 60, -30, 0); // Лево
    createBox(2, 8, 60, 30, 0);  // Право
    createBox(25, 8, 2, -17.5, 30); // Перед Л
    createBox(25, 8, 2, 17.5, 30);  // Перед П

    // Прилавок (Касса)
    createBox(40, 2, 3, 0, 10, 0xFFFFFF); 
    // Увеличил радиус до 6, чтобы точно доставало
    interactions.push({pos: new THREE.Vector3(-10,0,13), type:'cashier', radius:6});
    interactions.push({pos: new THREE.Vector3(10,0,13), type:'cashier', radius:6});
    
    // Кухня
    createBox(10, 4, 4, -15, -28, 0x111111);
    interactions.push({pos: new THREE.Vector3(-15,0,-24), type:'cook', radius:6, label:"ГОТОВИТЬ"});
    
    // Упаковка
    createBox(8, 2, 4, -25, -5, 0x8B4513);
    interactions.push({pos: new THREE.Vector3(-22,0,-5), type:'box', radius:6, label:"УПАКОВАТЬ"});

    // --- ПЕРСОНАЖ ---
    const player = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({color: 0xFFD700});
    const bodyMat = new THREE.MeshStandardMaterial({color: userData.skinColor});
    const pantsMat = new THREE.MeshStandardMaterial({color: 0x228B22});

    if (isRoundSkin) {
        // R15
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
        // R6
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

    // ИСПРАВЛЕН СПАВН: Поднял Y до 5, отодвинул Z до 50
    player.position.set(0, 5, 50);
    scene.add(player); camera.position.set(0,10,65);

    // --- NPC (ВОССТАНОВЛЕНЫ) ---
    const npcs = [];
    function createNPC() {
        const npc = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,2), new THREE.MeshStandardMaterial({color: Math.random()*0xffffff}));
        body.position.y=1;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4), new THREE.MeshStandardMaterial({color:0xffd700}));
        head.position.y=2.2;
        npc.add(body, head);
        
        npc.position.set((Math.random()-0.5)*20, 0, 55); // Спавн на улице
        scene.add(npc);

        npcs.push({
            mesh: npc,
            target: new THREE.Vector3((Math.random()-0.5)*10, 0, 14), // Идут к кассе
            state: 'walking_in',
            timer: 0
        });
    }
    for(let i=0; i<4; i++) setTimeout(createNPC, i*3000);


    // УПРАВЛЕНИЕ
    let moveFwd=0, moveTurn=0, vy=0;
    const z = document.getElementById('joystick-zone'); z.innerHTML='';
    joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white', size: 100});
    joystickManager.on('move', (e,d) => {
        moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.15;
        moveTurn = Math.cos(d.angle.radian)*0.08;
    });
    joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
    document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); if(player.position.y<=0.1) vy=0.3;});

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

        // UI ОБНОВЛЕНИЕ (ПЕРВЫМ ДЕЛОМ)
        let activeUI = null;
        interactions.forEach(zone => { if(player.position.distanceTo(zone.pos) < zone.radius) activeUI = zone; });

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

        // NPC
        npcs.forEach(bot => {
            if(bot.state === 'walking_in' || bot.state === 'walking_out') {
                const dir = new THREE.Vector3().subVectors(bot.target, bot.mesh.position).normalize();
                bot.mesh.position.add(dir.multiplyScalar(0.04));
                bot.mesh.lookAt(bot.target);

                if(bot.mesh.position.distanceTo(bot.target) < 1) {
                    if(bot.state === 'walking_in') {
                        bot.state = 'waiting';
                        bot.timer = 300;
                    } else {
                        bot.mesh.position.set((Math.random()-0.5)*20, 0, 55);
                        bot.target.set((Math.random()-0.5)*10, 0, 14);
                        bot.state = 'walking_in';
                    }
                }
            } else if (bot.state === 'waiting') {
                bot.timer--;
                if(bot.timer <= 0) {
                    bot.state = 'walking_out';
                    bot.target.set((Math.random()-0.5)*20, 0, 60);
                }
            }
        });

        const o = new THREE.Vector3(0,7,-10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+3, player.position.z);
        
        renderer.render(scene, camera);
    }
    animate();
}