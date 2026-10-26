// CreativeVox Media: premium WebGL layer for the hero (Three.js).
// Loaded lazily by index.html on capable desktop browsers only. The CSS 3D scene stays
// on top (cards, service objects); this adds real lighting, reflections and depth behind it.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const RED = 0xff303b;

function glowTexture(size, inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function streakTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 64;
  const g = c.getContext('2d');
  g.scale(1, 0.125);
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function additive(map, color, opacity) {
  return new THREE.MeshBasicMaterial({
    map, color, opacity, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  });
}

export function mountHeroScene({ hero, anchor }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-gl';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 0, 12);

  // lighting: soft key from the top left, red rim from the right
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 5, 6);
  scene.add(key);
  const fill = new THREE.PointLight(0xaab4ff, 40, 18, 2);
  fill.position.set(-5, -3, 4);
  scene.add(fill);
  const rim = new THREE.PointLight(RED, 90, 16, 2);
  rim.position.set(4.5, -1.5, 3.5);
  scene.add(rim);

  // everything that belongs to the hero object lives in this group, aligned to the CSS scene
  const rig = new THREE.Group();
  scene.add(rig);

  const dot = glowTexture(128, 'rgba(255,255,255,1)', 'rgba(255,255,255,.35)');

  // large soft glow behind the scene
  const back = new THREE.Sprite(new THREE.SpriteMaterial({
    map: dot, color: RED, opacity: 0.2, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  }));
  back.scale.set(11, 11, 1);
  back.position.z = -3.5;
  rig.add(back);

  // anamorphic light streak
  const streakMap = streakTexture();
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(13, 0.55), additive(streakMap, 0xff4a52, 0.5));
  streak.position.z = -1.4;
  rig.add(streak);
  const streakCore = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.1), additive(streakMap, 0xffffff, 0.5));
  streakCore.position.z = -1.35;
  rig.add(streakCore);

  // thin orbit rings with a travelling light each
  const rings = [];
  [
    { r: 3.35, tilt: [1.05, 0.0], speed: 0.14, color: 0xffffff, op: 0.4 },
    { r: 4.0, tilt: [0.82, 0.45], speed: -0.1, color: 0xff5962, op: 0.55 },
    { r: 4.6, tilt: [1.22, -0.35], speed: 0.065, color: 0xffffff, op: 0.2 }
  ].forEach((d, i) => {
    const tilt = new THREE.Group();
    tilt.rotation.set(d.tilt[0], d.tilt[1], 0);
    const spin = new THREE.Group();
    tilt.add(spin);
    spin.add(new THREE.Mesh(
      new THREE.TorusGeometry(d.r, 0.012, 10, 240),
      new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: d.op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    ));
    spin.add(new THREE.Mesh(
      new THREE.TorusGeometry(d.r, 0.06, 10, 240),
      new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.05, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
    ));
    const bead = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dot, color: i === 1 ? 0xff7b83 : RED, opacity: 0.95, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false
    }));
    bead.scale.set(0.62, 0.62, 1);
    bead.position.set(d.r, 0, 0);
    spin.add(bead);
    rig.add(tilt);
    rings.push({ spin, speed: d.speed });
  });

  // Decorative orbiting solids removed; keep the orbital rings and light beads.
  // depth particles: white dust and warm embers spread over the whole hero
  function makePoints(count, color, size, opacity, riseMin, riseMax) {
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = -7 + Math.random() * 10;
      seed[i * 2] = riseMin + Math.random() * (riseMax - riseMin);
      seed[i * 2 + 1] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: dot, color, size, sizeAttenuation: true, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
    }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { geo, pos, seed, count };
  }
  const dust = makePoints(640, 0xffffff, 0.09, 0.62, 0.05, 0.16);
  const embers = makePoints(200, 0xff5a4a, 0.13, 0.9, 0.12, 0.32);

  // sizing: keep the rig centred on the CSS scene
  const half = { w: 1, h: 1 };
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dist = camera.position.z;
    half.h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist;
    half.w = half.h * camera.aspect;
    const a = anchor.getBoundingClientRect(), r = hero.getBoundingClientRect();
    const nx = ((a.left + a.width / 2 - r.left) / r.width) * 2 - 1;
    const ny = -(((a.top + a.height / 2 - r.top) / r.height) * 2 - 1);
    rig.position.set(nx * half.w, ny * half.h, 0);
  }
  layout();
  const ro = new ResizeObserver(layout);
  ro.observe(hero);

  // pointer parallax
  let tx = 0, ty = 0, mx = 0, my = 0;
  function onMove(e) {
    const r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }
  function onLeave() { tx = 0; ty = 0; }
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);

  const clock = new THREE.Clock();
  let t = 0, intro = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    intro = Math.min(1, intro + dt / 2.4);
    const ease = 1 - Math.pow(1 - intro, 3);

    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;
    camera.position.x = mx * 0.7;
    camera.position.y = -my * 0.45;
    camera.lookAt(0, 0, 0);
    rig.rotation.y = mx * 0.16;
    rig.rotation.x = my * 0.1;
    rig.scale.setScalar(0.72 + 0.28 * ease);

    rings.forEach(r => { r.spin.rotation.z += dt * r.speed; });
    solids.forEach(s => {
      s.arm.rotation.z += dt * s.speed;
      s.mesh.rotation.x += dt * s.spin[0];
      s.mesh.rotation.y += dt * s.spin[1];
      s.mesh.rotation.z += dt * s.spin[2];
    });

    streak.material.opacity = 0.42 + Math.sin(t * 0.9) * 0.1;
    streakCore.material.opacity = 0.4 + Math.sin(t * 1.3 + 1) * 0.12;
    rim.intensity = 80 + Math.sin(t * 0.8) * 14;

    [dust, embers].forEach(p => {
      const a = p.pos;
      for (let i = 0; i < p.count; i++) {
        a[i * 3 + 1] += p.seed[i * 2] * dt;
        a[i * 3] += Math.sin(t * 0.25 + p.seed[i * 2 + 1]) * 0.003;
        if (a[i * 3 + 1] > 6) a[i * 3 + 1] = -6;
      }
      p.geo.attributes.position.needsUpdate = true;
    });

    renderer.render(scene, camera);
  }

  // run only while the hero is visible and the tab is active
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
    hero.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', sync);
    renderer.dispose();
    canvas.remove();
    hero.classList.remove('three-on');
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dispose(); });

  frame();
  sync();
  requestAnimationFrame(() => canvas.classList.add('is-on'));
  return { dispose };
}
