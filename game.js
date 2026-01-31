(() => {
  // ====== SETTING GAMPANG ======
  const HEART_TARGET = 10;

  const STICKMAN_AVATAR_SRC = "Sw.jpg"; // placeholder

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const hudHearts = document.getElementById("hudHearts");
  const hudStatus = document.getElementById("hudStatus");
  const btnJump = document.getElementById("btnJump");
  const btnRestart = document.getElementById("btnRestart");
  const btnPlayAgain = document.getElementById("btnPlayAgain");

  const winModalEl = document.getElementById("winModal");
  const winModal = new bootstrap.Modal(winModalEl, { backdrop: "static", keyboard: false });

  // ====== RESPONSIVE CANVAS ======
  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", () => {
    fitCanvas();
    world.groundY = getGroundY();
    if (!world.over && !world.won) {
      player.y = Math.min(player.y, world.groundY - player.h);
    }
  });

  function getGroundY() {
    const rect = canvas.getBoundingClientRect();
    return rect.height * 0.83;
  }

  // ====== ASSET ======
  const avatarImg = new Image();
  avatarImg.src = STICKMAN_AVATAR_SRC;

  // ====== WORLD ======
  const world = {
    running: true,      
    over: false,
    won: false,
    tPrev: performance.now(),
    speed: 190,         
    gravity: 1400,
    jumpV: 760,         
    hearts: 0,
    groundY: 0,
    timers: { obstacle: 0, heart: 0 },
    clouds: []
  };

  const player = {
    x: 78,
    y: 0,
    w: 44,
    h: 66,
    vy: 0,
    onGround: true
  };

  const obstacles = [];
  const hearts = [];
  const sparkles = [];

  // ====== UTIL ======
  const rand = (a, b) => Math.random() * (b - a) + a;

  function setHUD(status) {
    hudHearts.textContent = `❤️ ${world.hearts}/${HEART_TARGET}`;
    hudStatus.textContent = status;
  }

  function resetAndAutoStart() {
    world.running = true;
    world.over = false;
    world.won = false;
    world.tPrev = performance.now();
    world.speed = 190;
    world.hearts = 0;

    world.timers.obstacle = 0.7;
    world.timers.heart = 0.2;

    obstacles.length = 0;
    hearts.length = 0;
    sparkles.length = 0;
    world.clouds.length = 0;

    world.groundY = getGroundY();
    player.y = world.groundY - player.h;
    player.vy = 0;
    player.onGround = true;

    const rect = canvas.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
      world.clouds.push({
        x: rand(0, rect.width),
        y: rand(20, rect.height * 0.35),
        s: rand(0.7, 1.3),
        v: rand(10, 24)
      });
    }

    setHUD("Main!");
    requestAnimationFrame(loop);
  }

  function jump() {
    if (world.over || world.won) return;
    if (player.onGround) {
      player.vy = -world.jumpV;
      player.onGround = false;
    }
  }

  // ====== INPUT ======
  btnJump.addEventListener("click", jump);
  btnJump.addEventListener("touchstart", (e) => { e.preventDefault(); jump(); }, { passive: false });
  canvas.addEventListener("pointerdown", () => jump());

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); jump(); }
  });

  btnRestart.addEventListener("click", () => resetAndAutoStart());
  btnPlayAgain.addEventListener("click", () => resetAndAutoStart());

  // ====== SPAWN ======
  function spawnObstacle() {
    const rect = canvas.getBoundingClientRect();
    const h = rand(26, 46);
    const w = rand(26, 46);

    obstacles.push({
      x: rect.width + 20,
      y: world.groundY - h,
      w, h
    });
  }

  function spawnHeart() {
    const rect = canvas.getBoundingClientRect();
    const y = rand(world.groundY - 120, world.groundY - 70);
    hearts.push({ x: rect.width + 20, y, w: 28, h: 28, taken: false });
  }

  function sparkle(x, y) {
    for (let i = 0; i < 8; i++) {
      sparkles.push({
        x, y,
        vx: rand(-110, 110),
        vy: rand(-220, -70),
        life: rand(0.25, 0.5)
      });
    }
  }

  function aabb(a, b) {
    return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
  }

  // ====== LOOP ======
  function loop(tNow) {
    if (!world.running) return;

    const dt = Math.min(0.033, (tNow - world.tPrev) / 1000);
    world.tPrev = tNow;

    update(dt);
    draw();

    if (world.running) requestAnimationFrame(loop);
  }

  function update(dt) {
    if (world.over || world.won) return;

    world.speed = Math.min(260, world.speed + dt * 4);

    // player physics
    player.vy += world.gravity * dt;
    player.y += player.vy * dt;

    const groundTop = world.groundY - player.h;
    if (player.y >= groundTop) {
      player.y = groundTop;
      player.vy = 0;
      player.onGround = true;
    }

    // timers
    world.timers.obstacle -= dt;
    world.timers.heart -= dt;

    // rintangan 
    if (world.timers.obstacle <= 0) {
      spawnObstacle();
      world.timers.obstacle = rand(1.5, 2.3);
    }

    // hati cukup sering sampai target terpenuhi
    if (world.timers.heart <= 0 && world.hearts < HEART_TARGET) {
      spawnHeart();
      world.timers.heart = rand(0.8, 1.2);
    }

    // move
    const dx = world.speed * dt;
    for (const o of obstacles) o.x -= dx;
    for (const h of hearts) h.x -= dx;

    // cleanup
    while (obstacles.length && obstacles[0].x + obstacles[0].w < -40) obstacles.shift();
    while (hearts.length && hearts[0].x + hearts[0].w < -40) hearts.shift();

    // clouds drift
    const rect = canvas.getBoundingClientRect();
    for (const c of world.clouds) {
      c.x -= c.v * dt;
      if (c.x < -120) {
        c.x = rect.width + 120;
        c.y = rand(20, rect.height * 0.35);
        c.s = rand(0.7, 1.3);
        c.v = rand(10, 24);
      }
    }

    // sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 900 * dt;
      if (p.life <= 0) sparkles.splice(i, 1);
    }

    // collisions - obstacles
    for (const o of obstacles) {
      if (aabb(player, o)) {
        world.over = true;
        world.running = false;
        setHUD("Yah, gagal, ulang ya?");
        return;
      }
    }

    // collisions - hearts
    for (const h of hearts) {
      if (!h.taken && aabb(player, h)) {
        h.taken = true;
        world.hearts += 1;
        setHUD("Dapet ❤️");
        sparkle(h.x + h.w/2, h.y + h.h/2);

        if (world.hearts >= HEART_TARGET) {
          world.won = true;
          world.running = false;
          setHUD("Menang!");
          winModal.show();
          return;
        }
      }
    }
  }

  // ====== DRAW ======
  function draw() {
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);

    // sky tint
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(0, 0, W, H);

    // clouds
    for (const c of world.clouds) drawCloud(c.x, c.y, c.s);

    // ground
    const g = world.groundY;
    // grass
    ctx.fillStyle = "rgba(92, 210, 140, 0.55)";
    ctx.fillRect(0, g, W, H - g);
    // ground line
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(W, g);
    ctx.stroke();

    // little dots on ground (cute texture)
    for (let i = 0; i < 60; i++) {
      const x = (i * (W / 60)) + (Math.sin(i) * 4);
      const y = g + 18 + (i % 3) * 8;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // obstacles (soft blocks)
    for (const o of obstacles) {
      ctx.fillStyle = "rgba(255, 120, 160, 0.75)";
      roundRect(ctx, o.x, o.y, o.w, o.h, 12, true);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundRect(ctx, o.x + 6, o.y + 6, o.w - 12, Math.max(10, o.h * 0.25), 10, true);
    }

    // hearts
    for (const h of hearts) {
      if (h.taken) continue;
      ctx.font = "26px system-ui, -apple-system, Segoe UI, Roboto";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💗", h.x + h.w / 2, h.y + h.h / 2);
    }

    // sparkles
    for (const p of sparkles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.font = "16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("✨", p.x, p.y);
      ctx.globalAlpha = 1;
    }

    // player
    drawStickman(player.x, player.y, player.w, player.h);
    drawAvatarHead(player.x, player.y, player.w, player.h);
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(x, y, 18*s, 0, Math.PI*2);
    ctx.arc(x + 18*s, y + 6*s, 22*s, 0, Math.PI*2);
    ctx.arc(x + 40*s, y, 16*s, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(x + 12*s, y - 6*s, 10*s, 0, Math.PI*2);
    ctx.fill();
  }

  function drawStickman(x, y, w, h) {
    const cx = x + w/2;
    const headR = 18;
    const headY = y + headR + 6;

    ctx.strokeStyle = "rgba(20,20,30,0.75)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    // body
    ctx.beginPath();
    ctx.moveTo(cx, headY + headR);
    ctx.lineTo(cx, y + h - 18);
    ctx.stroke();

    // arms
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.48);
    ctx.lineTo(cx - 18, y + h * 0.58);
    ctx.moveTo(cx, y + h * 0.48);
    ctx.lineTo(cx + 18, y + h * 0.58);
    ctx.stroke();

    // legs
    ctx.beginPath();
    ctx.moveTo(cx, y + h - 18);
    ctx.lineTo(cx - 18, y + h - 4);
    ctx.moveTo(cx, y + h - 18);
    ctx.lineTo(cx + 18, y + h - 4);
    ctx.stroke();
  }

  function drawAvatarHead(x, y, w, h) {
    const cx = x + w/2;
    const headR = 18;
    const cy = y + headR + 6;

    // soft halo
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, headR + 5, 0, Math.PI*2);
    ctx.fill();

    // clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI*2);
    ctx.clip();

    if (avatarImg.complete && avatarImg.naturalWidth) {
      ctx.drawImage(avatarImg, cx - headR, cy - headR, headR*2, headR*2);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(cx - headR, cy - headR, headR*2, headR*2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PFP", cx, cy);
    }
    ctx.restore();

    // outline
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI*2);
    ctx.stroke();
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  // ====== INIT ======
  fitCanvas();
  world.groundY = getGroundY();
  resetAndAutoStart();
})();
