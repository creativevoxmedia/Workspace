// CreativeVox Media: real 3D service objects for the hero (Three.js).
// Replaces the flat CSS cards with lit, reflective 3D models that match our services:
//   Websites -> floating browser window, Social Media -> glossy beating heart,
//   Reels & Video -> phone with a spinning play button, Posts & Posters -> fanned poster cards,
//   Digital Growth -> rising 3D bar chart with an arrow.
// The CSS .obj links stay in place as clickable hit areas and labels; this canvas only draws.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const RED = 0xc1322a;
const U = 100;   // CSS pixels per world unit at the z = 0 plane
const M = 70;    // canvas margin around the scene so bobbing objects are never clipped

/* ---------- small helpers ---------- */
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function roundedPlane(w, h, r) {
  const x = -w / 2, y = -h / 2, s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 8);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5);
  return g;
}

function glassMat() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x111f1a, metalness: 0.65, roughness: 0.3,
    clearcoat: 1, clearcoatRoughness: 0.2, envMapIntensity: 1.15
  });
}

function glowTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(216,239,232,.35)');
  grad.addColorStop(1, 'rgba(216,239,232,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOutBack = k => { const c1 = 1.4, c3 = c1 + 1, x = k - 1; return 1 + c3 * x * x * x + c1 * x * x; };

/* ---------- textures drawn with canvas 2D ---------- */
function browserTex() {
  return canvasTex(640, 420, (g, w, h) => {
    g.fillStyle = '#0a120f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#14261f'; g.fillRect(0, 0, w, 46);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(28 + i * 24, 23, 7, 0, 6.3); g.fill(); });
    g.fillStyle = '#0a120f'; rr(g, 120, 11, 400, 24, 12); g.fill();
    g.fillStyle = '#6e9285'; g.font = '600 14px Inter,Arial,sans-serif'; g.fillText('creativevox', 140, 28);
    const gr = g.createLinearGradient(30, 70, 610, 220);
    gr.addColorStop(0, '#c1322a'); gr.addColorStop(1, '#9bc6b2');
    g.fillStyle = gr; rr(g, 30, 70, 580, 150, 18); g.fill();
    g.fillStyle = '#fff'; g.font = '800 32px Inter,Arial,sans-serif';
    g.fillText('Make your brand', 54, 124);
    g.fillText('impossible to ignore.', 54, 163);
    g.fillStyle = 'rgba(216,239,232,.92)'; rr(g, 54, 182, 118, 24, 12); g.fill();
    for (let i = 0; i < 3; i++) {
      const x = 30 + i * 200;
      g.fillStyle = '#12221c'; rr(g, x, 244, 180, 132, 14); g.fill();
      g.strokeStyle = 'rgba(216,239,232,.1)'; g.lineWidth = 1.5; rr(g, x, 244, 180, 132, 14); g.stroke();
      g.fillStyle = i === 0 ? '#c1322a' : 'rgba(216,239,232,.2)'; rr(g, x + 16, 262, 44, 44, 11); g.fill();
      g.fillStyle = 'rgba(216,239,232,.22)'; rr(g, x + 16, 322, 120, 9, 4.5); g.fill();
      g.fillStyle = 'rgba(216,239,232,.12)'; rr(g, x + 16, 342, 84, 9, 4.5); g.fill();
    }
  });
}

function chipTex() {
  return canvasTex(224, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#172a23'); gr.addColorStop(1, '#0a1410');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c1322a'; g.font = '900 64px Inter,Arial,sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('</>', w / 2, h / 2 + 4);
  });
}

function phoneTex() {
  return canvasTex(256, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#c1322a'); gr.addColorStop(0.55, '#9bc6b2'); gr.addColorStop(1, '#6dceae');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(216,239,232,.10)';
    for (let y = 8; y < h; y += 40) g.fillRect(0, y, w, 8);
    g.fillStyle = 'rgba(216,239,232,.9)'; g.font = '800 22px Inter,Arial,sans-serif';
    g.fillText('REEL', 22, 46);
    g.fillStyle = 'rgba(216,239,232,.5)'; rr(g, 22, h - 118, 150, 12, 6); g.fill();
    rr(g, 22, h - 92, 100, 12, 6); g.fill();
  });
}

function posterTex(kind) {
  return canvasTex(320, 420, (g, w, h) => {
    if (kind === 0) {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#c1322a'); gr.addColorStop(0.55, '#88bca4'); gr.addColorStop(1, '#98c5b0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(216,239,232,.85)'; g.beginPath(); g.arc(230, 110, 70, 0, 6.3); g.fill();
      g.fillStyle = '#fff';
      rr(g, 28, 270, 220, 22, 11); g.fill();
      g.globalAlpha = 0.8; rr(g, 28, 308, 160, 22, 11); g.fill();
      g.globalAlpha = 0.6; rr(g, 28, 346, 100, 22, 11); g.fill();
      g.globalAlpha = 1;
    } else if (kind === 1) {
      g.fillStyle = '#111f1a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c1322a'; g.beginPath(); g.arc(160, 150, 96, 0, 6.3); g.fill();
      g.fillStyle = '#fff'; g.font = '900 54px Inter,Arial,sans-serif'; g.textAlign = 'center';
      g.fillText('NEW', 160, 168);
      g.fillStyle = 'rgba(216,239,232,.85)'; rr(g, 40, 290, 240, 20, 10); g.fill();
      g.fillStyle = 'rgba(216,239,232,.4)'; rr(g, 40, 326, 170, 20, 10); g.fill();
    } else {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#6dceae'); gr.addColorStop(1, '#c1322a');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(216,239,232,.16)'; g.lineWidth = 1.5;
      for (let i = 0; i <= w; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
      for (let j = 0; j <= h; j += 40) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
      g.fillStyle = '#fff'; g.font = '900 120px Inter,Arial,sans-serif'; g.textAlign = 'center';
      g.fillText('CV', 160, 250);
      g.fillStyle = 'rgba(216,239,232,.85)'; rr(g, 60, 316, 200, 20, 10); g.fill();
    }
  });
}

/* ---------- the five objects ---------- */
function buildWebsite() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(2.0, 1.3, 0.1, 4, 0.07), glassMat()));
  const screen = new THREE.Mesh(
    roundedPlane(1.88, 1.88 * 420 / 640, 0.04),
    new THREE.MeshBasicMaterial({ map: browserTex(), toneMapped: false })
  );
  screen.position.z = 0.052;
  g.add(screen);

  const chip = new THREE.Group();
  chip.add(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.38, 0.06, 3, 0.05), glassMat()));
  const face = new THREE.Mesh(roundedPlane(0.56, 0.32, 0.035), new THREE.MeshBasicMaterial({ map: chipTex(), toneMapped: false }));
  face.position.z = 0.032;
  chip.add(face);
  chip.position.set(0.9, -0.62, 0.42);
  chip.rotation.set(0, -0.15, 0.06);
  g.add(chip);

  return {
    group: g,
    update(t) {
      chip.position.y = -0.62 + Math.sin(t * 1.5) * 0.05;
      chip.rotation.y = -0.15 + Math.sin(t * 0.9) * 0.12;
    }
  };
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.15, -0.35, -0.55, -0.1, -0.55, 0.2);
  s.bezierCurveTo(-0.55, 0.5, -0.15, 0.6, 0, 0.32);
  s.bezierCurveTo(0.15, 0.6, 0.55, 0.5, 0.55, 0.2);
  s.bezierCurveTo(0.55, -0.1, 0.15, -0.35, 0, -0.5);
  return s;
}

function buildHeart() {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(heartShape(), {
    depth: 0.28, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 8, curveSegments: 28
  });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({
    color: RED, roughness: 0.26, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15,
    emissive: 0x320c09, emissiveIntensity: 1, envMapIntensity: 1.1
  });
  const heart = new THREE.Mesh(geo, mat);
  heart.scale.setScalar(1.05);
  g.add(heart);

  // small hearts floating up, like likes
  const minis = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(geo, mat.clone());
    m.material.transparent = true;
    m.scale.setScalar(0.2 - i * 0.02);
    g.add(m);
    minis.push({ mesh: m, off: i / 3, x: -0.5 + i * 0.5 });
  }

  return {
    group: g,
    update(t) {
      const p = (t * 0.7) % 1;
      const beat = Math.exp(-Math.pow((p - 0.1) * 16, 2)) * 0.2 + Math.exp(-Math.pow((p - 0.3) * 16, 2)) * 0.13;
      heart.scale.setScalar(1.05 * (1 + beat));
      heart.rotation.y = Math.sin(t * 0.8) * 0.25;
      minis.forEach(m => {
        const q = ((t * 0.32) + m.off) % 1;
        m.mesh.position.set(m.x + Math.sin(q * 6.3) * 0.1, 0.35 + q * 1.15, 0.3);
        m.mesh.material.opacity = Math.sin(q * Math.PI);
        m.mesh.rotation.y = t * 1.2;
      });
    }
  };
}

function buildReel() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(0.95, 1.75, 0.1, 4, 0.12), glassMat()));
  const screen = new THREE.Mesh(
    roundedPlane(0.8, 1.6, 0.08),
    new THREE.MeshBasicMaterial({ map: phoneTex(), toneMapped: false })
  );
  screen.position.z = 0.052;
  g.add(screen);

  const notch = new THREE.Mesh(roundedPlane(0.24, 0.05, 0.025), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  notch.position.set(0, 0.74, 0.055);
  g.add(notch);

  const tri = new THREE.Shape();
  tri.moveTo(-0.16, -0.24); tri.lineTo(0.28, 0); tri.lineTo(-0.16, 0.24); tri.closePath();
  const playGeo = new THREE.ExtrudeGeometry(tri, {
    depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 5, curveSegments: 8
  });
  playGeo.center();
  const play = new THREE.Mesh(playGeo, new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.3, clearcoat: 1, emissive: 0xffffff, emissiveIntensity: 0.3, envMapIntensity: 0.8
  }));
  play.position.set(0.02, 0.15, 0.22);
  g.add(play);

  const trackGeo = new THREE.PlaneGeometry(0.62, 0.045);
  const track = new THREE.Mesh(trackGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
  track.position.set(0, -0.64, 0.058);
  g.add(track);
  const barGeo = new THREE.PlaneGeometry(0.62, 0.045);
  barGeo.translate(0.31, 0, 0);
  const bar = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: RED, toneMapped: false }));
  bar.position.set(-0.31, -0.64, 0.06);
  g.add(bar);

  return {
    group: g,
    update(t) {
      play.rotation.y = Math.sin(t * 0.9) * 0.55;
      play.scale.setScalar(1 + 0.1 * Math.sin(t * 2.8));
      bar.scale.x = Math.max(0.001, (t / 5) % 1);
    }
  };
}

function buildPosters() {
  const g = new THREE.Group();
  const cards = [
    { x: -0.42, y: -0.02, z: -0.12, rz: 0.2, ry: 0.28, tex: 0 },
    { x: 0.0, y: 0.04, z: 0.04, rz: -0.04, ry: 0.0, tex: 1 },
    { x: 0.42, y: -0.04, z: 0.2, rz: -0.22, ry: -0.28, tex: 2 }
  ].map((c, i) => {
    const card = new THREE.Group();
    card.add(new THREE.Mesh(new RoundedBoxGeometry(0.98, 1.3, 0.04, 3, 0.03), glassMat()));
    const face = new THREE.Mesh(roundedPlane(0.9, 1.22, 0.03), new THREE.MeshBasicMaterial({ map: posterTex(c.tex), toneMapped: false }));
    face.position.z = 0.022;
    card.add(face);
    card.position.set(c.x, c.y, c.z);
    card.rotation.set(0, c.ry, c.rz);
    g.add(card);
    return { card, c, i };
  });
  return {
    group: g,
    update(t) {
      cards.forEach(o => {
        o.card.position.y = o.c.y + Math.sin(t * 1.1 + o.i * 1.6) * 0.045;
        o.card.rotation.z = o.c.rz + Math.sin(t * 0.7 + o.i) * 0.03;
      });
    }
  };
}

function buildChart() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.07, 0.6, 3, 0.03), glassMat());
  base.position.y = -0.55;
  g.add(base);

  const heights = [0.42, 0.64, 0.54, 0.92, 1.18];
  const lo = new THREE.Color(0x702521), hi = new THREE.Color(0xe63f36);
  const barGeo = new RoundedBoxGeometry(0.2, 1, 0.2, 3, 0.05);
  const bars = heights.map((h, i) => {
    const m = new THREE.Mesh(barGeo, new THREE.MeshPhysicalMaterial({
      color: lo.clone().lerp(hi, i / 4), roughness: 0.28, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15,
      emissive: 0x3e1512, emissiveIntensity: 0.9, envMapIntensity: 1.1
    }));
    m.position.x = -0.62 + i * 0.31;
    g.add(m);
    return { m, h, i };
  });

  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.3, 24),
    new THREE.MeshPhysicalMaterial({ color: 0x9bc6b2, emissive: 0x88bca4, emissiveIntensity: 0.7, roughness: 0.3, clearcoat: 1 })
  );
  g.add(arrow);

  const top = -0.55 + 0.035;
  return {
    group: g,
    update(t) {
      bars.forEach(o => {
        const p = ((t * 0.22) - o.i * 0.05 + 10) % 1;
        const k = p < 0.35 ? 0.08 + 0.92 * (1 - Math.pow(1 - p / 0.35, 3)) : p < 0.84 ? 1 : 1 - 0.92 * ((p - 0.84) / 0.16);
        const hh = Math.max(0.02, o.h * k);
        o.m.scale.y = hh;
        o.m.position.y = top + hh / 2;
      });
      arrow.position.set(0.62, top + 1.18 + 0.32 + Math.sin(t * 2.2) * 0.07, 0);
      arrow.rotation.y = t * 1.1;
    }
  };
}

/* ---------- mount ---------- */
export function mountHeroObjects({ hero, art, scene }) {
  if (!hero || !art || !scene) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-gl-front';
  canvas.setAttribute('aria-hidden', 'true');
  art.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    canvas.remove();
    throw e;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const sc = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  sc.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camDist = 14;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  camera.position.set(0, 0, camDist);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 4, 7);
  sc.add(key);
  const fill = new THREE.PointLight(0xbfeadc, 24, 18, 2);
  fill.position.set(-5, -3, 5);
  sc.add(fill);
  const rim = new THREE.PointLight(RED, 60, 15, 2);
  rim.position.set(4, -1, 4);
  sc.add(rim);

  const glowTex = glowTexture();
  const defs = [
    { sel: '.o-code',   build: buildWebsite, z: 0.7, rot: [0.10, -0.28, -0.03], bob: [0.9, 0.09], scale: 0.9,  shift: [-18, -34], delay: 0.7 },
    { sel: '.o-social', build: buildHeart,   z: 1.1, rot: [-0.05, 0.2, 0.05],   bob: [1.1, 0.10], scale: 0.68, shift: [44, -34],  delay: 0.85 },
    { sel: '.o-reel',   build: buildReel,    z: 0.9, rot: [0.08, -0.34, 0.04],  bob: [0.85, 0.10], scale: 0.88, shift: [30, -4],  delay: 1.0 },
    { sel: '.o-poster', build: buildPosters, z: 0.8, rot: [0.10, 0.3, -0.05],   bob: [0.8, 0.09], scale: 0.8,  shift: [-4, 34],   delay: 1.15 },
    { sel: '.o-chart',  build: buildChart,   z: 0.6, rot: [0.22, -0.2, 0.0],    bob: [1.0, 0.08], scale: 0.78, shift: [20, 30],   delay: 1.3 }
  ];

  const objs = [];
  defs.forEach((d, i) => {
    const el = hero.querySelector(d.sel);
    if (!el) return;
    const built = d.build();
    const holder = new THREE.Group();
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color: RED, opacity: 0.2, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false
    }));
    glow.scale.set(3.4, 3.4, 1);
    glow.position.z = -0.6;
    holder.add(glow);
    holder.add(built.group);
    holder.scale.setScalar(0.0001);
    sc.add(holder);
    el.style.translate = d.shift[0] + 'px ' + d.shift[1] + 'px';
    const o = Object.assign({ el, holder, group: built.group, built, px: 0, py: 0, hv: 0, hover: false, phase: i * 1.7 }, d);
    const on = () => { o.hover = true; }, off = () => { o.hover = false; };
    el.addEventListener('pointerenter', on);
    el.addEventListener('pointerleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
    o.unbind = () => {
      el.removeEventListener('pointerenter', on);
      el.removeEventListener('pointerleave', off);
      el.removeEventListener('focus', on);
      el.removeEventListener('blur', off);
    };
    objs.push(o);
  });

  if (!objs.length) { renderer.dispose(); canvas.remove(); return null; }

  /* keep the canvas glued to the CSS scene and each model glued to its CSS anchor */
  let dprCap = 1.5;
  function layout() {
    const W = scene.offsetWidth + M * 2, H = scene.offsetHeight + M * 2;
    if (!W || !H) return;
    canvas.style.left = (scene.offsetLeft - M) + 'px';
    canvas.style.top = (scene.offsetTop - M) + 'px';
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((H / U / 2) / camDist));
    camera.updateProjectionMatrix();
    objs.forEach(o => {
      const cx = o.el.offsetLeft + o.el.offsetWidth / 2;
      const cy = o.el.offsetTop + o.el.offsetHeight / 2;
      o.px = (M + cx + o.shift[0] - W / 2) / U;
      o.py = -(M + cy + o.shift[1] - H / 2) / U;
    });
  }
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(scene);
  ro.observe(art);

  /* pointer parallax */
  let tx = 0, ty = 0, mx = 0, my = 0;
  let heroRect = null;
  const dirtyRect = () => { heroRect = null; };
  window.addEventListener('scroll', dirtyRect, { passive: true });
  window.addEventListener('resize', dirtyRect, { passive: true });
  function onMove(e) {
    const r = heroRect || (heroRect = hero.getBoundingClientRect());
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  function onLeave() { tx = 0; ty = 0; }
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);

  const clock = new THREE.Clock();
  let frameAcc = 0, frameN = 0;   // adaptive pixel ratio: step down once if the GPU cannot hold ~42 fps
  let t = 0;
  function frame() {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    frameAcc += raw; frameN++;
    if (frameN === 90) { if (frameAcc / frameN > 0.024 && dprCap > 1) { dprCap = Math.max(1, dprCap - 0.25); layout(); } frameAcc = 0; frameN = 0; }
    t += dt;
    mx += (tx - mx) * 0.06;
    my += (ty - my) * 0.06;
    rim.intensity = 56 + Math.sin(t * 0.8) * 10;

    objs.forEach(o => {
      const k = clamp((t - o.delay) / 0.95, 0, 1);
      const e = easeOutBack(k);
      o.hv += ((o.hover ? 1 : 0) - o.hv) * Math.min(1, dt * 8);
      o.holder.scale.setScalar(Math.max(0.0001, o.scale * e * (1 + 0.1 * o.hv)));
      o.holder.position.set(
        o.px + mx * 0.12 * o.z,
        o.py + Math.sin(t * o.bob[0] + o.phase) * o.bob[1] - (1 - e) * 0.7,
        o.z - (1 - e) * 3 + o.hv * 0.4
      );
      o.group.rotation.set(
        o.rot[0] + Math.sin(t * 0.45 + o.phase) * 0.05 - my * 0.2,
        o.rot[1] + Math.sin(t * 0.55 + o.phase) * 0.14 + mx * 0.4,
        o.rot[2]
      );
      o.built.update(t, dt);
    });

    renderer.render(sc, camera);
  }

  /* run only while the hero is on screen and the tab is active */
  let inView = true, running = false;
  function sync() {
    const want = inView && !document.hidden;
    if (want && !running) { clock.getDelta(); renderer.setAnimationLoop(frame); running = true; }
    else if (!want && running) { renderer.setAnimationLoop(null); running = false; }
  }
  const io = new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', sync);

  function dispose() {
    renderer.setAnimationLoop(null);
    io.disconnect(); ro.disconnect();
    hero.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', dirtyRect);
    window.removeEventListener('resize', dirtyRect);
    hero.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', sync);
    objs.forEach(o => { o.unbind(); o.el.style.translate = ''; });
    renderer.dispose();
    canvas.remove();
    hero.classList.remove('objects-on');
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dispose(); });

  frame();
  sync();
  requestAnimationFrame(() => canvas.classList.add('is-on'));
  return { dispose };
}
