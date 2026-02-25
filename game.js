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
let userData = {}; // Тут храним деньги и скин
let gameActive = false;
let joystickManager = null;

// --- АВТОРИЗАЦИЯ ---
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('loading-text').style.display='none';
        
        // Слушаем изменения денег и скина
        db.ref('users/' + user.uid).on('value', snap => {
            userData = snap.val() || { username: "Player", currency: 0, skinColor: "#0000FF" };
            updateDashboardUI();
        });
    } else {
        document.getElementById('loading-text').style.display='none';
        document.getElementById('auth-forms').style.display='block';
    }
});

function login() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(e, p).catch(err => alert(err.message));
}
function register() {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    const n = document.getElementById('username').value;
    if(!n) return alert("Nickname!");
    auth.createUserWithEmailAndPassword(e, p).then(c => {
        // Даем 100 R$ при регистрации
        db.ref('users/' + c.user.uid).set({ 
            username: n, email: e, searchName: n.toLowerCase(),
            currency: 100, skinColor: "#0000FF" 
        });
    }).catch(err => alert(err.message));
}
function logout() { auth.signOut(); location.reload(); }

// --- UI МЕНЮ ---
function updateDashboardUI() {
    document.getElementById('auth-screen').style.display='none';
    document.getElementById('dashboard').style.display='flex';
    document.getElementById('dash-username').innerText = userData.username;
    document.getElementById('dash-money').innerText = userData.currency;
    document.getElementById('dash-avatar').innerText = userData.username[0];
    renderShop();
    renderGames();
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display='none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+t).style.display='block';
    
    // Подсветка кнопок
    const btns = document.querySelectorAll('.tab-btn');
    if(t==='games') btns[0].classList.add('active');
    if(t==='shop') btns[1].classList.add('active');
    if(t==='friends') btns[2].classList.add('active');
}

function renderGames() {
    const list = document.getElementById('games-list');
    if(list.innerHTML !== "") return; // Чтобы не перерисовывать
    const games = [
        { id: "city", title: "Blox City", color: "#44aa44", icon: "🏙️" },
        { id: "parkour", title: "Obby Parkour", color: "#aa4444", icon: "🔥" },
        { id: "space", title: "Moon Base", color: "#222244", icon: "🚀" }
    ];
    games.forEach(g => {
        list.innerHTML += `<div class="game-card" onclick="startGame('${g.id}')">
            <div class="game-icon" style="background:${g.color}">${g.icon}</div>
            <div style="flex-grow:1"><h4>${g.title}</h4></div>
            <button class="play-small">PLAY</button>
        </div>`;
    });
}

// --- МАГАЗИН ---
function renderShop() {
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    const items = [
        { name: "Blue Shirt", color: "#0000FF", price: 0 },
        { name: "Red Shirt", color: "#FF0000", price: 50 },
        { name: "Green Shirt", color: "#00FF00", price: 50 },
        { name: "Black Shirt", color: "#111111", price: 100 },
        { name: "Gold Shirt", color: "#FFD700", price: 500 }
    ];

    items.forEach(item => {
        const isOwned = (userData.skinColor === item.color);
        const btnText = isOwned ? "OWNED" : `${item.price} R$`;
        const btnClass = isOwned ? "btn-buy owned" : "btn-buy";
        const onclick = isOwned ? "" : `buyItem('${item.color}', ${item.price})`;

        list.innerHTML += `
            <div class="shop-item">
                <div class="item-preview" style="background:${item.color}"></div>
                <b>${item.name}</b>
                <button class="${btnClass}" onclick="${onclick}">${btnText}</button>
            </div>
        `;
    });
}

function buyItem(color, price) {
    if(userData.currency >= price) {
        db.ref('users/' + currentUser.uid).update({
            currency: userData.currency - price,
            skinColor: color
        });
    } else {
        alert("Not enough Rubloxi!");
    }
}

// --- НАСТРОЙКИ ---
function openSettings() { document.getElementById('settings-modal').style.display='flex'; }
function closeSettings() { document.getElementById('settings-modal').style.display='none'; }

// --- ПОИСК ДРУЗЕЙ ---
function searchUsers() {
    const val = document.getElementById('search-input').value.toLowerCase();
    const res = document.getElementById('search-results');
    res.innerHTML = 'Searching...';
    db.ref('users').once('value').then(snap => {
        res.innerHTML = '';
        snap.forEach(c => {
            const u = c.val();
            if(u.username.toLowerCase().includes(val) && c.key !== currentUser.uid) {
                res.innerHTML += `<div class="user-card"><span>${u.username}</span><button onclick="sendReq('${c.key}')" class="play-small" style="padding:5px 10px; font-size:10px;">ADD</button></div>`;
            }
        });
        if(res.innerHTML==='') res.innerHTML='Not found';
    });
}
function sendReq(uid) { db.ref(`friend_requests/${uid}/${currentUser.uid}`).set({username:userData.username}); alert('Sent!'); }


// --- ИГРОВОЙ ДВИЖОК ---
function exitGame() { gameActive = false; location.reload(); }

function sendChat() {
    const i = document.getElementById('chat-input');
    if(i.value.trim()) db.ref('games/global/chat').push({user:userData.username, text:i.value});
    i.value='';
}

function startGame(mode) {
    gameActive = true;
    document.getElementById('dashboard').style.display='none';
    document.getElementById('game-ui').style.display='block';
    
    // Чат
    db.ref('games/global/chat').limitToLast(5).on('child_added', s => {
        const d = s.val();
        const b = document.getElementById('chat-messages');
        b.innerHTML += `<div><span style="color:#00d2ff">${d.user}:</span> ${d.text}</div>`;
        b.scrollTop = b.scrollHeight;
    });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = document.getElementById('opt-shadows').checked; // Настройка теней
    
    const cont = document.body;
    while(cont.querySelector('canvas')) cont.querySelector('canvas').remove();
    cont.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff,0.6));
    const dl = new THREE.DirectionalLight(0xffffff,0.8); dl.position.set(20,50,10); 
    if(renderer.shadowMap.enabled) dl.castShadow=true; 
    scene.add(dl);

    // Уровень
    let platforms = [];
    if(mode === 'city') {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x333333}));
        f.rotation.x = -Math.PI/2; if(renderer.shadowMap.enabled) f.receiveShadow=true; scene.add(f);
        for(let i=0;i<10;i++){
            const h=5+Math.random()*10;
            const b=new THREE.Mesh(new THREE.BoxGeometry(4,h,4), new THREE.MeshStandardMaterial({color:0x888888}));
            b.position.set((Math.random()-0.5)*60,h/2,(Math.random()-0.5)*60);
            if(renderer.shadowMap.enabled) b.castShadow=true; scene.add(b); platforms.push(b);
        }
    } else if (mode === 'parkour') {
        scene.background = new THREE.Color(0x330000);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshBasicMaterial({color:0xff0000}));
        l.rotation.x = -Math.PI/2; scene.add(l);
        const s = new THREE.Mesh(new THREE.BoxGeometry(5,1,5), new THREE.MeshStandardMaterial({color:0x555555}));
        s.position.y=0.5; scene.add(s); platforms.push(s);
        for(let i=1;i<15;i++){
            const p=new THREE.Mesh(new THREE.BoxGeometry(3,1,3), new THREE.MeshStandardMaterial({color:0x00ff00}));
            p.position.set((Math.random()-0.5)*8, 2+Math.random()*2, -i*5);
            scene.add(p); platforms.push(p);
        }
    } else {
        scene.background = new THREE.Color(0x000000);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x555555}));
        m.rotation.x = -Math.PI/2; scene.add(m);
    }

    // Персонаж (с купленным цветом)
    const player = new THREE.Group();
    const head = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshStandardMaterial({color:0xFFD700})); head.position.y=3.5;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2,2,1), new THREE.MeshStandardMaterial({color: userData.skinColor})); torso.position.y=2;
    const legMat = new THREE.MeshStandardMaterial({color:0x00FF00});
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), legMat); lLeg.position.y=-1;
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.9,2,0.9), legMat); rLeg.position.y=-1;
    const lG = new THREE.Group(); lG.add(lLeg); lG.position.set(-0.5,1,0);
    const rG = new THREE.Group(); rG.add(rLeg); rG.position.set(0.5,1,0);
    player.add(head,torso,lG,rG);
    player.userData={lg:lG, rg:rG};
    scene.add(player); camera.position.set(0,5,-10);

    // Управление
    let moveFwd=0, moveTurn=0, vy=0;
    const z = document.getElementById('joystick-zone'); z.innerHTML='';
    joystickManager = nipplejs.create({zone:z, mode:'static', position:{left:'50%', top:'50%'}, color:'white', size: 100});
    joystickManager.on('move', (e,d) => {
        // ЗАМЕДЛЕНИЕ СКОРОСТИ: 0.08 вместо 0.15
        moveFwd = Math.sin(d.angle.radian)*Math.min(d.force,2)*0.08;
        moveTurn = Math.cos(d.angle.radian)*0.06;
    });
    joystickManager.on('end', () => {moveFwd=0; moveTurn=0;});
    
    // Прыжок
    document.getElementById('btnJump').addEventListener('touchstart', e=>{e.preventDefault(); if(player.position.y<=0.1) vy=0.3;});

    function animate() {
        if(!gameActive) return;
        requestAnimationFrame(animate);

        if(moveFwd!==0) {
            player.translateZ(moveFwd);
            player.rotation.y -= moveTurn;
            const t = Date.now()*0.01; // Замедленная анимация ног
            player.userData.lg.rotation.x = Math.sin(t);
            player.userData.rg.rotation.x = -Math.sin(t);
        } else {
            player.userData.lg.rotation.x=0; player.userData.rg.rotation.x=0;
        }

        if(mode==='parkour' && player.position.y < 0.5) { player.position.set(0,5,0); vy=0; }
        if(player.position.y>0 || vy>0) { player.position.y+=vy; vy-=0.015; }
        else { player.position.y=0; vy=0; }

        const o = new THREE.Vector3(0,6,-10).applyMatrix4(player.matrixWorld);
        camera.position.lerp(o, 0.1);
        camera.lookAt(player.position.x, player.position.y+2, player.position.z);
        renderer.render(scene, camera);
    }
    window.addEventListener('resize', () => {
        camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    animate();
}