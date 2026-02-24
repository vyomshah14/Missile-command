// --- NAVIGATION LOGIC ---
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    // Remove active class from buttons
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Highlight button
    const activeBtn = Array.from(document.querySelectorAll('nav button')).find(btn => btn.getAttribute('onclick').includes(pageId));
    if(activeBtn) activeBtn.classList.add('active');

    // If entering demo page, start game loop if not already running
    if(pageId === 'demo') {
        if(!gameRunning) startGame();
    } else {
        // Pause game if leaving demo page
        gameRunning = false;
    }
}

// --- MINI GAME SIMULATION LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const citiesEl = document.getElementById('cities');
const ammoEl = document.getElementById('ammo');

let gameRunning = false;
let score = 0;
let ammo = 30;
let cities = 6;
let explosions = [];
let enemyMissiles = [];
let playerMissiles = [];
let lastTime = 0;
let spawnRate = 2000;
let lastSpawn = 0;

// Game Objects
const battery = { x: 300, y: 380 };
const cityPositions = [50, 150, 250, 350, 450, 550];
let activeCities = [true, true, true, true, true, true];

function resetGame() {
    score = 0;
    ammo = 30;
    cities = 6;
    activeCities = [true, true, true, true, true, true];
    enemyMissiles = [];
    playerMissiles = [];
    explosions = [];
    updateUI();
}

function startGame() {
    if(!gameRunning) {
        resetGame();
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    }
}

// Input Handling
canvas.addEventListener('mousedown', (e) => {
    if (!gameRunning || ammo <= 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Fire missile from battery to click location
    playerMissiles.push({
        x: battery.x,
        y: battery.y,
        tx: x,
        ty: y,
        speed: 8
    });
    
    ammo--;
    updateUI();
});

function spawnEnemy() {
    const startX = Math.random() * canvas.width;
    // Target a random active city
    const activeCityIndices = activeCities.map((isActive, i) => isActive ? i : -1).filter(i => i !== -1);
    
    if (activeCityIndices.length === 0) {
        gameOver();
        return;
    }

    const targetIndex = activeCityIndices[Math.floor(Math.random() * activeCityIndices.length)];
    const targetX = cityPositions[targetIndex];
    const targetY = 390;

    enemyMissiles.push({
        x: startX,
        y: 0,
        tx: targetX,
        ty: targetY,
        speed: 1 + (score / 5000) // Get faster as score increases
    });
}

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 1,
        maxRadius: 40,
        life: 1.0
    });
}

function updateUI() {
    scoreEl.innerText = score;
    citiesEl.innerText = cities;
    ammoEl.innerText = ammo;
    
    if(ammo === 0) {
        // Refill ammo after delay logic could go here, for now just let them run out
        ammoEl.style.color = 'red';
    } else {
        ammoEl.style.color = 'var(--neon-red)';
    }
}

function gameOver() {
    gameRunning = false;
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.fillStyle = "var(--neon-red)";
    ctx.font = "30px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
    ctx.font = "15px 'Press Start 2P'";
    ctx.fillText("Click to Restart", canvas.width/2, canvas.height/2 + 40);
    
    canvas.addEventListener('click', restartHandler, {once:true});
}

function restartHandler() {
    resetGame();
    gameRunning = true;
    requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (!gameRunning) return;

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Clear Screen
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Ground
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 390, canvas.width, 10);

    // Draw Cities
    ctx.fillStyle = "#00f3ff";
    activeCities.forEach((isActive, i) => {
        if(isActive) {
            ctx.fillRect(cityPositions[i] - 15, 375, 30, 15);
            // City Windows
            ctx.fillStyle = "#fff";
            ctx.fillRect(cityPositions[i] - 10, 380, 5, 5);
            ctx.fillRect(cityPositions[i] + 5, 380, 5, 5);
            ctx.fillStyle = "#00f3ff";
        }
    });

    // Draw Battery
    ctx.fillStyle = "#39ff14";
    ctx.beginPath();
    ctx.arc(battery.x, battery.y, 10, Math.PI, 0);
    ctx.fill();

    // Spawn Enemies
    if (timestamp - lastSpawn > spawnRate) {
        spawnEnemy();
        lastSpawn = timestamp;
        if(spawnRate > 500) spawnRate -= 10;
    }

    // Update & Draw Player Missiles
    // ENHANCED VISIBILITY: Thicker lines, glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4; 
    
    for (let i = playerMissiles.length - 1; i >= 0; i--) {
        let m = playerMissiles[i];
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        
        // Simple lerp towards target
        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < m.speed) {
            // Reached target, explode
            createExplosion(m.tx, m.ty);
            playerMissiles.splice(i, 1);
        } else {
            m.x += (dx / dist) * m.speed;
            m.y += (dy / dist) * m.speed;
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
        }
    }

    // Update & Draw Explosions
    // Reset shadow for explosions to save performance/look better
    ctx.shadowBlur = 0;
    
    for (let i = explosions.length - 1; i >= 0; i--) {
        let ex = explosions[i];
        ex.radius += 2;
        ex.life -= 0.02;

        if (ex.life <= 0 || ex.radius >= ex.maxRadius) {
            explosions.splice(i, 1);
            continue;
        }

        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 7, 58, ${ex.life})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${ex.life})`;
        ctx.stroke();

        // Check collision with enemies
        for (let j = enemyMissiles.length - 1; j >= 0; j--) {
            let em = enemyMissiles[j];
            const dist = Math.hypot(em.x - ex.x, em.y - ex.y);
            if (dist < ex.radius) {
                // Hit!
                enemyMissiles.splice(j, 1);
                score += 100;
                updateUI();
            }
        }
    }

    // Update & Draw Enemy Missiles
    // ENHANCED VISIBILITY: Thicker lines, glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff073a";
    ctx.strokeStyle = "#ff073a";
    ctx.lineWidth = 4;

    for (let i = enemyMissiles.length - 1; i >= 0; i--) {
        let m = enemyMissiles[i];
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);

        const dx = m.tx - m.x;
        const dy = m.ty - m.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < m.speed) {
            // Hit ground/city
            createExplosion(m.tx, m.ty);
            
            // Check if city hit
            const cityIndex = cityPositions.indexOf(m.tx);
            if(cityIndex !== -1 && activeCities[cityIndex]) {
                activeCities[cityIndex] = false;
                cities--;
                updateUI();
                if(cities === 0) gameOver();
            }

            enemyMissiles.splice(i, 1);
        } else {
            m.x += (dx / dist) * m.speed;
            m.y += (dy / dist) * m.speed;
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
            
            // Trail effect (Thicker and brighter)
            ctx.beginPath();
            ctx.moveTo(m.x, m.y);
            ctx.lineTo(m.x - (dx/dist)*15, m.y - (dy/dist)*15);
            ctx.strokeStyle = "rgba(255, 7, 58, 0.6)";
            ctx.lineWidth = 6;
            ctx.stroke();
            
            // Reset for next loop
            ctx.strokeStyle = "#ff073a";
            ctx.lineWidth = 4;
        }
    }
    
    // Reset shadow for next frame
    ctx.shadowBlur = 0;

    requestAnimationFrame(gameLoop);
}