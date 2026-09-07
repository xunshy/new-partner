type Particle = { x: number; y: number; vx: number; vy: number; rotation: number; spin: number; size: number; color: string; life: number };
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastBurst = 0;

/** 出货撒花。3 秒内只放一次，减弱动态效果时直接跳过。 */
export function celebrate(colors: string[], count = 90) {
  if (reduced() || Date.now() - lastBurst < 3000) return;
  lastBurst = Date.now();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:92';
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth, height = window.innerHeight;
  canvas.width = width * ratio; canvas.height = height * ratio;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.scale(ratio, ratio);
  document.body.appendChild(canvas);
  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2, speed = 4 + Math.random() * 7;
    return { x: width / 2, y: height * 0.4, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 3.5, rotation: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.32, size: 5 + Math.random() * 6, color: colors[Math.floor(Math.random() * colors.length)]!, life: 1 };
  });
  let frames = 0;
  const step = () => {
    context.clearRect(0, 0, width, height);
    let alive = false;
    for (const particle of particles) {
      particle.vy += 0.16; particle.vx *= 0.994;
      particle.x += particle.vx; particle.y += particle.vy;
      particle.rotation += particle.spin; particle.life -= 0.008;
      if (particle.life <= 0 || particle.y > height + 40) continue;
      alive = true;
      context.save();
      context.globalAlpha = particle.life;
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
      context.restore();
    }
    if (alive && ++frames < 420) requestAnimationFrame(step);
    else canvas.remove();
  };
  requestAnimationFrame(step);
}

/** SSR 专属：整屏闪一下稀有度色。 */
export function flash(rarity: string) {
  if (reduced()) return;
  const layer = document.createElement('div');
  layer.className = 'rarity-flash';
  layer.setAttribute('aria-hidden', 'true');
  layer.dataset.rarity = rarity;
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1000);
}
