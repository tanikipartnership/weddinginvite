const weddingDate = new Date('2026-12-11T00:00:00').getTime();
const introScreen = document.getElementById('introScreen');
const mainContent = document.getElementById('mainContent');
const openInvite = document.getElementById('openInvite');
const music = document.getElementById('bgMusic');
const musicBtn = document.getElementById('musicBtn');

const MUSIC_START = 15; // seconds
function seekToStart() {
  try { music.currentTime = MUSIC_START; } catch (e) { /* ignore */ }
}
music.addEventListener('loadedmetadata', seekToStart);
music.addEventListener('ended', () => {
  seekToStart();
  music.play().catch(() => {});
});

openInvite.addEventListener('click', async () => {
  if (openInvite.dataset.opened === '1') return;
  openInvite.dataset.opened = '1';

  // 1. Open the flap AND start the zoom immediately on click
  openInvite.classList.add('open');
  openInvite.classList.add('zoom');

  // 2. Reveal the main invitation immediately underneath the intro
  //    so there's no blank flash when the intro fades out.
  mainContent.classList.remove('hidden');
  window.scrollTo(0, 0);
  revealOnScroll();
  window.dispatchEvent(new Event('resize'));

  // 3. Fade the intro screen out as the zoom completes
  setTimeout(() => {
    introScreen.style.transition = 'opacity 500ms ease';
    introScreen.style.opacity = '0';
  }, 1900);

  // 4. Remove the intro screen entirely once faded
  setTimeout(() => {
    introScreen.style.display = 'none';
  }, 2500);

  try {
    await music.play();
    musicBtn.classList.add('playing');
  } catch (err) {
    console.log('Autoplay blocked. User can play music manually.');
  }
});

openInvite.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openInvite.click();
  }
});

musicBtn.addEventListener('click', async () => {
  if (music.paused) {
    await music.play();
    musicBtn.classList.add('playing');
  } else {
    music.pause();
    musicBtn.classList.remove('playing');
  }
});

function updateCountdown() {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  if (distance < 0) {
    document.getElementById('countdown').innerHTML = '<p>The celebration has begun!</p>';
    return;
  }

  document.getElementById('days').textContent = Math.floor(distance / (1000 * 60 * 60 * 24));
  document.getElementById('hours').textContent = Math.floor((distance / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
  document.getElementById('minutes').textContent = Math.floor((distance / (1000 * 60)) % 60).toString().padStart(2, '0');
  document.getElementById('seconds').textContent = Math.floor((distance / 1000) % 60).toString().padStart(2, '0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

// Scratch-to-reveal countdown
(function initScratch() {
  const canvas = document.getElementById('scratchCanvas');
  const wrap = document.getElementById('scratchWrap');
  const container = document.querySelector('.scratch-canvas-container');
  const hint = document.getElementById('scratchHint');
  if (!canvas || !wrap || !container) return;

  const ctx = canvas.getContext('2d');
  const countdownEl = document.getElementById('countdown');
  let isDrawing = false;
  let revealed = false;
  let scratchDist = 0;
  let lastPos = null;
  const BRUSH_RADIUS = 18;
  const REVEAL_THRESHOLD = 320; // px of dragging before full reveal

  function paintCover() {
    const rect = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';

    // Base metallic foil gradient
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#e8c992');
    gradient.addColorStop(0.35, '#b88945');
    gradient.addColorStop(0.65, '#d8a96a');
    gradient.addColorStop(1, '#a5715a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Soft diagonal sheen
    const sheen = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.45, 'rgba(255,250,235,0.35)');
    sheen.addColorStop(0.55, 'rgba(255,250,235,0.35)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Fine grain noise for a brushed-foil feel
    const grainCount = Math.floor(rect.width * rect.height / 90);
    for (let i = 0; i < grainCount; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const a = Math.random();
      ctx.fillStyle = a > 0.5
        ? `rgba(255,240,210,${(a - 0.5) * 0.18})`
        : `rgba(80,45,20,${(0.5 - a) * 0.18})`;
      ctx.fillRect(x, y, 1, 1);
    }

    // Switch into erase mode for scratches
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = BRUSH_RADIUS * 2;
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  }

  function revealAll() {
    if (revealed) return;
    revealed = true;
    const rect = wrap.getBoundingClientRect();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, rect.width, rect.height);
    canvas.classList.add('revealed');
    if (hint) hint.classList.add('hidden-hint');
    if (countdownEl) {
      countdownEl.classList.remove('flash');
      void countdownEl.offsetWidth;
      countdownEl.classList.add('flash');
      popConfettiFrom(countdownEl);
    }
  }

  function scratchStroke(from, to) {
    // Soft feathered main stroke
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();

    // Tiny "shavings" along the path for realism
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(len / 4));
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t + (Math.random() - 0.5) * BRUSH_RADIUS * 1.6;
      const y = from.y + dy * t + (Math.random() - 0.5) * BRUSH_RADIUS * 1.6;
      const r = Math.random() * 1.6 + 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function scratch(e) {
    if (!isDrawing || revealed) return;
    if (e.cancelable) e.preventDefault();
    const pos = getPos(e);
    if (lastPos) {
      scratchStroke(lastPos, pos);
      const dx = pos.x - lastPos.x;
      const dy = pos.y - lastPos.y;
      scratchDist += Math.hypot(dx, dy);
      if (scratchDist >= REVEAL_THRESHOLD) revealAll();
    } else {
      // Initial dab
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    if (hint && !hint.classList.contains('hidden-hint')) hint.classList.add('hidden-hint');
    lastPos = pos;
  }

  function startDraw(e) {
    isDrawing = true;
    scratchDist = 0;
    lastPos = null;
    scratch(e);
  }
  function endDraw() { isDrawing = false; lastPos = null; }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', scratch);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', scratch, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  paintCover();
  window.addEventListener('resize', () => { if (!revealed) paintCover(); });
})();

function createPetal() {
  const petal = document.createElement('span');
  petal.className = 'petal';
  const size = 16 + Math.random() * 15; // 16-31px petals for less text overlap
  petal.style.left = Math.random() * 100 + 'vw';
  petal.style.width = size + 'px';
  petal.style.height = size + 'px';
  petal.style.animationDuration = 8 + Math.random() * 7 + 's';
  petal.style.opacity = 0.42 + Math.random() * 0.30;
  // tint between soft pink, coral, and blush via hue-rotate + saturation
  const hue = -15 + Math.random() * 40;
  const sat = 0.85 + Math.random() * 0.5;
  petal.style.filter = `drop-shadow(0 2px 3px rgba(122,60,56,.18)) hue-rotate(${hue}deg) saturate(${sat})`;
  document.getElementById('petals').appendChild(petal);
  setTimeout(() => petal.remove(), 16000);
}
setInterval(createPetal, 780);

function popConfettiFrom(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;
  const colors = ['#d8b981', '#b88945', '#c7837d', '#fff8ef'];
  const count = 90;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 8;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const velocity = 180 + Math.random() * 280;
    const drift = (Math.random() - 0.5) * 80;
    const duration = 900 + Math.random() * 900;

    piece.className = 'confetti-piece';
    piece.style.left = `${originX}px`;
    piece.style.top = `${originY}px`;
    piece.style.width = `${size}px`;
    piece.style.height = `${Math.max(4, size * 0.55)}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty('--dx', `${Math.cos(angle) * velocity + drift}px`);
    piece.style.setProperty('--dy', `${Math.sin(angle) * velocity - 140}px`);
    piece.style.setProperty('--rot', `${Math.floor(Math.random() * 720 - 360)}deg`);
    piece.style.animationDuration = `${duration}ms`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), duration + 80);
  }
}

const sections = document.querySelectorAll('.section, footer');
sections.forEach(section => section.classList.add('reveal'));

function revealOnScroll() {
  sections.forEach(section => {
    const rect = section.getBoundingClientRect();
    if (rect.top < window.innerHeight - 90) section.classList.add('visible');
  });
}
window.addEventListener('scroll', revealOnScroll);

