// CreativeVox Media: "The Creative Core", the signature WebGL sculpture in the hero.
//
// A suspended chrome ribbon, a glass cube holding a frosted crystal and an energy core,
// satin metal rings, luminous filaments with travelling light pulses, orbiting fragments,
// four abstract glass "creative artifacts" and a depth-layered particle field.
//
// Loaded lazily from index.html (vendored Three.js, no build step). Everything is plain
// module code: no per-frame React state, shared geometries/materials, one render loop that
// pauses off-screen / in background tabs, adaptive pixel ratio, and a full dispose().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

/* ---------- palette (kept in one place so the whole scene can be re-tinted) ---------- */
const COBALT = 0x356bff;
const ICE = 0xa9d7ff;
const WHITE = 0xf5f7fb;
const SILVER = 0xb9c2d0;

const TAU = Math.PI * 2;
const FOV = 34;
const CAM_Z = 11.5;      // base camera distance
const R_UNITS = 4.6;     // world radius of the whole sculpture, used to fit it to its stage

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);

function rng(seed) {                       // deterministic composition on every load
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- small texture helpers ---------- */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  return t;
}

function glowTexture() {
  return canvasTexture(128, 128, (g, w) => {
    const grad = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.22, 'rgba(255,255,255,.4)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
  });
}

function beamTexture() {                    // soft vertical shaft: bright spine, faded ends
  return canvasTexture(64, 256, (g, w, h) => {
    const x = g.createLinearGradient(0, 0, w, 0);
    x.addColorStop(0, 'rgba(255,255,255,0)');
    x.addColorStop(0.5, 'rgba(255,255,255,1)');
    x.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = x;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in';
    const y = g.createLinearGradient(0, 0, 0, h);
    y.addColorStop(0, 'rgba(0,0,0,0)');
    y.addColorStop(0.35, 'rgba(0,0,0,1)');
    y.addColorStop(0.65, 'rgba(0,0,0,1)');
    y.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = y;
    g.fillRect(0, 0, w, h);
  });
}

function roundRectPath(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Abstract creative artifacts: no text, no fake software UI, just recognisable structure. */
const STROKE = 'rgba(169,215,255,.95)';
const FILL = 'rgba(53,107,255,.30)';
const artifactDrawers = {
  layout(g) {                               // website layout grid
    g.strokeStyle = STROKE; g.fillStyle = FILL; g.lineWidth = 5;
    roundRectPath(g, 40, 36, 432, 288, 22); g.stroke();
    roundRectPath(g, 64, 60, 384, 40, 12); g.fill(); g.stroke();
    roundRectPath(g, 64, 122, 180, 118, 12); g.fill(); g.stroke();
    roundRectPath(g, 268, 122, 180, 52, 12); g.stroke();
    roundRectPath(g, 268, 188, 180, 52, 12); g.stroke();
    roundRectPath(g, 64, 260, 384, 40, 12); g.stroke();
  },
  video(g) {                                // video frame with play mark and timeline
    g.strokeStyle = STROKE; g.fillStyle = STROKE; g.lineWidth = 5;
    roundRectPath(g, 40, 40, 432, 242, 22); g.stroke();
    g.beginPath(); g.moveTo(228, 112); g.lineTo(228, 210); g.lineTo(306, 161); g.closePath(); g.fill();
    g.globalAlpha = 0.35; g.beginPath(); g.moveTo(64, 312); g.lineTo(448, 312); g.stroke();
    g.globalAlpha = 1; g.strokeStyle = '#356bff'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(64, 312); g.lineTo(236, 312); g.stroke();
  },
  social(g) {                               // social content tile
    g.strokeStyle = STROKE; g.fillStyle = FILL; g.lineWidth = 5;
    roundRectPath(g, 96, 30, 320, 300, 30); g.stroke();
    g.beginPath(); g.arc(150, 92, 26, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(196, 80); g.lineTo(330, 80); g.moveTo(196, 106); g.lineTo(276, 106); g.stroke();
    roundRectPath(g, 126, 144, 260, 124, 16); g.fill(); g.stroke();
    g.fillStyle = STROKE;
    [150, 190, 230].forEach(x => { g.beginPath(); g.arc(x, 302, 7, 0, TAU); g.fill(); });
  },
  brand(g) {                                // minimal identity symbol
    g.strokeStyle = STROKE; g.fillStyle = STROKE; g.lineWidth = 6;
    g.beginPath(); g.arc(256, 180, 112, 0.35, TAU - 0.9); g.stroke();
    g.beginPath(); g.arc(256, 180, 58, Math.PI * 0.7, Math.PI * 2.3); g.stroke();
    g.strokeStyle = '#356bff'; g.lineWidth = 8;
    g.beginPath(); g.moveTo(200, 260); g.lineTo(318, 96); g.stroke();
    g.beginPath(); g.arc(330, 82, 12, 0, TAU); g.fill();
  }
};

/* ---------- environment: a dark studio with a few soft light panels (HDR via PMREM) ---------- */
function buildEnvironment(renderer) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0f1830);
  const panel = (w, h, pos, color, k) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide })
    );
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(9, 5, [-6, 6, 6], WHITE, 6.5);       // neutral key softbox
  panel(2.2, 11, [9, 1, -2], COBALT, 6);     // cool blue rim strip
  panel(11, 1.6, [0, -5.5, -6], ICE, 3);     // low rear kicker
  panel(3, 7, [-9, -1, -4], ICE, 2.2);
  panel(7, 3, [2, 8, -5], WHITE, 2.4);
  panel(5, 5, [0, 0, 10], SILVER, 0.9);      // faint fill so shadow sides never go dead black
  panel(16, 16, [0, 11, 0], ICE, 0.9);       // overhead dome: gives horizontal surfaces a cool sheen
  panel(16, 6, [0, -7, 3], COBALT, 0.9);     // floor bounce
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.03).texture;
  pm.dispose();
  s.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/* ---------- main entry ---------- */
export function mountCreativeCore({ hero, stage, lite = false, still = false, quick = false }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'core-gl';
  canvas.setAttribute('aria-hidden', 'true');

  // throws when WebGL is unavailable: the caller keeps the CSS/SVG fallback in that case
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: !lite, powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  hero.insertBefore(canvas, hero.querySelector('.core-vignette') || hero.firstChild);

  const scene = new THREE.Scene();
  scene.environment = buildEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.set(0, 0.7, CAM_Z);

  const rig = new THREE.Group();            // positioned and scaled to fit the stage
  scene.add(rig);
  const sculpt = new THREE.Group();         // the slowly rotating sculpture
  rig.add(sculpt);

  const glow = glowTexture();
  const additive = (opts) => new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, ...opts
  });

  /* ----- lighting: cool blue rim, neutral key, subtle rear, plus the core's own light ----- */
  const key = new THREE.DirectionalLight(WHITE, 2.4);
  key.position.set(-4, 5, 7);
  const rim = new THREE.DirectionalLight(COBALT, 3.4);
  rim.position.set(6, 1.5, -4);
  const rear = new THREE.PointLight(ICE, 16, 14, 2);
  rear.position.set(0, 1, -5);
  const coreLight = new THREE.PointLight(0x6b95ff, 0, 10, 2);
  scene.add(key, rim, rear);
  sculpt.add(coreLight);

  /* ----- materials (shared) ----- */
  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xeef3fc, metalness: 1, roughness: 0.16, envMapIntensity: 1.5,
    side: THREE.DoubleSide, clearcoat: lite ? 0 : 0.35, clearcoatRoughness: 0.2
  });
  const satin = new THREE.MeshStandardMaterial({ color: SILVER, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfe2ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.2,
    envMapIntensity: 1.9, clearcoat: lite ? 0 : 1, clearcoatRoughness: 0.05, depthWrite: false
  });
  const frosted = new THREE.MeshPhysicalMaterial({
    color: 0xb9d0ff, metalness: 0.1, roughness: 0.6, transparent: true, opacity: 0.5,
    envMapIntensity: 1.2, flatShading: true
  });

  /* ================= chrome ribbon ================= */
  const segs = lite ? 110 : 190;
  const knot = [];
  for (let i = 0; i < 64; i++) {
    const u = (i / 64) * TAU, r = 1.95 + 0.42 * Math.cos(3 * u);
    knot.push(new THREE.Vector3(r * Math.cos(2 * u), 0.8 * Math.sin(3 * u), r * Math.sin(2 * u) * 0.62));
  }
  const ribbonCurve = new THREE.CatmullRomCurve3(knot, true, 'centripetal');
  const frames = ribbonCurve.computeFrenetFrames(segs, true);
  const centers = [];
  for (let i = 0; i < segs; i++) centers.push(ribbonCurve.getPointAt(i / segs));
  const ribPos = new Float32Array(segs * 2 * 3);
  const ribIdx = [];
  for (let i = 0; i < segs; i++) {
    const a = i * 2, c = ((i + 1) % segs) * 2;
    ribIdx.push(a, a + 1, c, a + 1, c + 1, c);
  }
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.BufferAttribute(ribPos, 3).setUsage(THREE.DynamicDrawUsage));
  ribGeo.setIndex(ribIdx);
  const ribbon = new THREE.Mesh(ribGeo, chrome);
  ribbon.frustumCulled = false;
  const ribbonGroup = new THREE.Group();
  ribbonGroup.add(ribbon);
  sculpt.add(ribbonGroup);

  function updateRibbon(t) {                // folds and unfurls: twist and width breathe along the path
    for (let i = 0; i < segs; i++) {
      const u = (i / segs) * TAU;
      const twist = u + 0.55 * Math.sin(3 * u + t * 0.5) + t * 0.15;
      const w = 0.34 + 0.1 * Math.sin(2 * u + t * 0.4);
      const n = frames.normals[i], b = frames.binormals[i], c = centers[i];
      const dx = (n.x * Math.cos(twist) + b.x * Math.sin(twist)) * w;
      const dy = (n.y * Math.cos(twist) + b.y * Math.sin(twist)) * w;
      const dz = (n.z * Math.cos(twist) + b.z * Math.sin(twist)) * w;
      const o = i * 6;
      ribPos[o] = c.x + dx; ribPos[o + 1] = c.y + dy; ribPos[o + 2] = c.z + dz;
      ribPos[o + 3] = c.x - dx; ribPos[o + 4] = c.y - dy; ribPos[o + 5] = c.z - dz;
    }
    ribGeo.attributes.position.needsUpdate = true;
    ribGeo.computeVertexNormals();
  }

  /* ================= glass cube + frosted crystal + energy core ================= */
  const glassGroup = new THREE.Group();
  sculpt.add(glassGroup);
  const cubeGeo = new RoundedBoxGeometry(1.85, 1.85, 1.85, lite ? 3 : 5, 0.12);
  glassGroup.add(new THREE.Mesh(cubeGeo, glassMat));
  const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.86, 1.86, 1.86));
  const edgeVerts = edgeGeo.attributes.position.count;
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({
    color: ICE, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false
  }));
  glassGroup.add(edges);
  const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), frosted);
  glassGroup.add(crystal);

  const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: WHITE, toneMapped: false }));
  const coreHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: COBALT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  }));
  const coreSpark = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: ICE, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false
  }));
  coreHalo.renderOrder = 10; coreSpark.renderOrder = 11;   // draw the glow after the glass so the core stays visible
  sculpt.add(coreMesh, coreHalo, coreSpark);

  /* ================= satin rings ================= */
  const ringDefs = [
    { r: 2.7, tube: 0.034, tilt: [0.95, 0.15], speed: 0.12, accent: true },
    { r: 3.15, tube: 0.024, tilt: [0.45, 0.7], speed: -0.08 },
    { r: 3.6, tube: 0.018, tilt: [1.25, -0.5], speed: 0.05 }
  ];
  const rings = ringDefs.map(d => {
    const tilt = new THREE.Group();
    tilt.rotation.set(d.tilt[0], d.tilt[1], 0);
    const spin = new THREE.Group();
    tilt.add(spin);
    spin.add(new THREE.Mesh(new THREE.TorusGeometry(d.r, d.tube, 12, lite ? 96 : 180), satin));
    if (d.accent) {                         // a short emissive arc: a "connection" between rings
      const arc = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.045, 10, 48, 0.9), additive({ color: COBALT, opacity: 0.9 }));
      spin.add(arc);
    }
    sculpt.add(tilt);
    return { tilt, spin, speed: d.speed };
  });

  /* ================= filaments + travelling signal pulses ================= */
  const filaments = [];
  const filMat = additive({ color: ICE, opacity: 0.0 });
  function addFilament(points, rad) {
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, lite ? 36 : 72, rad, 5, false), filMat);
    sculpt.add(mesh);
    filaments.push({ curve, t: -(0.8 + filaments.length * 0.55), dur: 2.4 + (filaments.length % 3) * 0.5 });
  }
  const core0 = new THREE.Vector3(0, 0, 0);
  for (let k = 0; k < 5; k++) {             // core -> points on the ribbon
    const end = ribbonCurve.getPointAt((k + 0.35) / 5);
    const mid = core0.clone().lerp(end, 0.5);
    mid.add(new THREE.Vector3(Math.sin(k * 2.1) * 0.7, Math.cos(k * 1.7) * 0.6, Math.sin(k * 1.3) * 0.7));
    addFilament([core0.clone().multiplyScalar(0.3), mid, end], 0.008);
  }
  for (let k = 0; k < 2; k++) {             // two streams that follow the ribbon centreline
    const pts = [];
    for (let i = 0; i <= 8; i++) pts.push(ribbonCurve.getPointAt(((k * 0.5 + i * 0.045) % 1)).multiplyScalar(1.02));
    addFilament(pts, 0.007);
  }
  const TRAIL = 6;
  const pulsePos = new Float32Array(filaments.length * TRAIL * 3);
  const pulseCol = new Float32Array(filaments.length * TRAIL * 3);
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3).setUsage(THREE.DynamicDrawUsage));
  pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseCol, 3).setUsage(THREE.DynamicDrawUsage));
  const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({
    size: 0.2, map: glow, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true
  }));
  pulses.frustumCulled = false;
  sculpt.add(pulses);
  const iceC = new THREE.Color(ICE);

  /* ================= fragments (instanced): drift, then periodically align to the ribbon ================= */
  const rand = rng(20260);
  function makeFragments(count, geo, mat) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        r: 2.3 + rand() * 2.0, th: rand() * TAU, ph: 0.35 + rand() * 2.4,
        sp: (0.04 + rand() * 0.09) * (rand() < 0.5 ? -1 : 1), s: 0.6 + rand() * 0.9,
        spin: [0.2 + rand() * 0.8, 0.2 + rand() * 0.8, 0.2 + rand() * 0.8],
        al: rand() * TAU, u: rand(), em: rand() * 0.5
      });
    }
    sculpt.add(mesh);
    return { mesh, data };
  }
  const fragA = makeFragments(lite ? 10 : 22, new THREE.TetrahedronGeometry(0.09, 0), satin);
  const fragB = makeFragments(lite ? 6 : 14, new RoundedBoxGeometry(0.16, 0.16, 0.03, 2, 0.01), chrome);
  const dummy = new THREE.Object3D();
  const tmpV = new THREE.Vector3();
  const tmpT = new THREE.Vector3();

  /* ================= creative artifacts: abstract glass interface fragments ================= */
  const slabGeo = new RoundedBoxGeometry(1.4, 0.98, 0.06, 3, 0.05);
  const planeGeo = new THREE.PlaneGeometry(1.4, 0.98);
  const slabMat = lite
    ? new THREE.MeshStandardMaterial({ color: 0xcfe2ff, metalness: 0.2, roughness: 0.2, transparent: true, opacity: 0.2 })
    : new THREE.MeshPhysicalMaterial({
        color: 0xcfe2ff, metalness: 0, roughness: 0.08, transparent: true, opacity: 0.2,
        clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, depthWrite: false
      });
  const artifactDefs = [
    { kind: 'layout', pos: [-3.1, 1.75, 1.0], s: 0.92, rz: 0.08 },
    { kind: 'video', pos: [3.25, 1.2, 0.7], s: 0.84, rz: -0.1 },
    { kind: 'social', pos: [-2.8, -1.95, 1.3], s: 0.72, rz: -0.06 },
    { kind: 'brand', pos: [3.0, -1.8, 1.5], s: 0.7, rz: 0.09 }
  ];
  const artifacts = artifactDefs.map((d, i) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(slabGeo, slabMat));
    const face = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
      map: canvasTexture(512, 360, artifactDrawers[d.kind]), transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false
    }));
    face.position.z = 0.036;
    g.add(face);
    g.position.set(d.pos[0], d.pos[1], d.pos[2]);
    g.userData = { base: d.pos, s: d.s, rz: d.rz, i };
    rig.add(g);
    return g;
  });

  /* ================= particle field (two depth layers) ================= */
  const field = new THREE.Group();
  scene.add(field);
  function makeParticles(count, size, zMin, zMax, opacity) {
    const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
    const vy = new Float32Array(count), ph = new Float32Array(count);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 20;
      pos[i * 3 + 1] = (rand() - 0.5) * 11;
      pos[i * 3 + 2] = zMin + rand() * (zMax - zMin);
      vy[i] = 0.04 + rand() * 0.14;
      ph[i] = rand() * TAU;
      c.set(rand() < 0.7 ? ICE : WHITE).multiplyScalar(0.35 + rand() * 0.65);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size, map: glow, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, sizeAttenuation: true
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    field.add(pts);
    return { geo, pos, vy, ph, count, mat, opacity };
  }
  const nBack = lite ? 120 : 380, nFront = lite ? 40 : 110;
  const back = makeParticles(nBack, 0.07, -7, -1, 0.85);
  const front = makeParticles(nFront, 0.12, 2.5, 6, 0.9);

  /* ================= environment details: floor grid, contact glow, light beam, ripples ================= */
  // faint grid that only reads when the camera rises above the floor plane
  const gridSegs = 10, gridLines = 21, half = 8;
  const gPos = [], gCol = [];
  const gc = new THREE.Color(COBALT);
  const pushGridLine = (ax, az, bx, bz, o) => {
    for (let s = 0; s < gridSegs; s++) {
      const s0 = s / gridSegs, s1 = (s + 1) / gridSegs;
      [s0, s1].forEach(f => {
        const x = lerp(ax, bx, f), z = lerp(az, bz, f);
        const fade = Math.pow(1 - Math.abs(f * 2 - 1), 1.4) * Math.pow(1 - Math.abs(o) / half, 0.9);
        gPos.push(x, 0, z);
        gCol.push(gc.r * fade, gc.g * fade, gc.b * fade);
      });
    }
  };
  for (let i = 0; i < gridLines; i++) {
    const o = lerp(-half, half, i / (gridLines - 1));
    pushGridLine(-half, o, half, o, o);
    pushGridLine(o, -half, o, half, o);
  }
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gPos, 3));
  gridGeo.setAttribute('color', new THREE.Float32BufferAttribute(gCol, 3));
  const grid = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  }));
  grid.position.y = -3.7;
  rig.add(grid);

  const pool = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), additive({ map: glow, color: COBALT, opacity: 0 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -3.68;
  rig.add(pool);

  const beamMat = additive({ map: beamTexture(), color: ICE, opacity: 0 });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 9), beamMat);
  beam.rotation.z = -0.62;
  beam.position.z = 0.4;
  sculpt.add(beam);
  const sheen = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: COBALT, transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false
  }));
  sheen.scale.set(3.4, 3.4, 1);
  sculpt.add(sheen);

  const rippleGeo = new THREE.RingGeometry(0.92, 1.0, 96);
  const ripples = [0, 1].map(() => {
    const m = new THREE.Mesh(rippleGeo, additive({ color: ICE, opacity: 0 }));
    m.visible = false;
    rig.add(m);
    return { m, t0: -10, dur: 0.95, power: 1 };
  });
  let rippleIdx = 0;
  function spawnRipple(power, now) {
    const r = ripples[rippleIdx++ % ripples.length];
    r.t0 = now; r.power = power; r.m.visible = true;
  }

  /* ================= sizing: fit the sculpture to the stage element ================= */
  const base = { x: 0, y: 0 };
  let rigScale = 1, ppu = 100, radiusPx = 200, cx = 0, cy = 0, heroTop = 0, heroH = 1, vw = 1, vh = 1;
  let dpr = 1, dprCap = lite ? 1.25 : 1.75;
  function layout() {
    const w = hero.clientWidth, h = hero.clientHeight;
    if (!w || !h) return;
    vw = w; vh = h;
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan((FOV * Math.PI) / 360) * CAM_Z;
    ppu = h / (2 * halfH);
    const hr = hero.getBoundingClientRect(), ar = stage.getBoundingClientRect();
    cx = ar.left + ar.width / 2 - hr.left;
    cy = ar.top + ar.height / 2 - hr.top;
    radiusPx = Math.min(ar.width, ar.height) * 0.5;
    const fit = parseFloat(getComputedStyle(stage).getPropertyValue('--core-scale')) || 1;   // per-breakpoint fit set in CSS
    rigScale = (radiusPx * fit) / (R_UNITS * ppu);
    base.x = (cx - w / 2) / ppu;
    base.y = -(cy - h / 2) / ppu;
    heroTop = hr.top + window.scrollY;
    heroH = h;
    if (still) draw(0);
  }

  /* ================= interaction state ================= */
  let px = 0, py = 0, mx = 0, my = 0;       // pointer target / smoothed (-1..1)
  let hoverT = 0, hover = 0;
  const ptr = new THREE.Vector3();          // pointer in world space on the z = 0 plane
  let clickAge = 99, scrollP = 0, scrollT = 0;
  let lastHoverFire = 0;

  function onMove(e) {
    if (e.pointerType !== 'mouse' || still) return;
    const r = hero.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    px = (x / r.width - 0.5) * 2;
    py = (y / r.height - 0.5) * 2;
    hoverT = 1 - smooth(0.5, 1.15, Math.hypot(x - cx, y - cy) / radiusPx);
    ptr.set((x - vw / 2) / ppu, -(y - vh / 2) / ppu, 0);
  }
  function onLeave() { px = 0; py = 0; hoverT = 0; }
  function onDown(e) {
    if (still) return;
    const r = hero.getBoundingClientRect();
    const d = Math.hypot(e.clientX - r.left - cx, e.clientY - r.top - cy) / radiusPx;
    if (d > 0.95) return;
    clickAge = 0;
    spawnRipple(1, tNow);
    filaments.forEach(f => { f.t = 0; });
  }
  function onScroll() { scrollT = clamp((window.scrollY - heroTop) / heroH); }
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);
  stage.addEventListener('pointerdown', onDown);
  if (!still) window.addEventListener('scroll', onScroll, { passive: true });

  const ro = new ResizeObserver(layout);
  ro.observe(hero);
  ro.observe(stage);

  /* ================= per-frame update ================= */
  let t = 0, ti = 0, tNow = 0, frameN = 0, introPulsed = false;
  const introSpeed = quick ? 2.8 : 1;

  function update(dt, real = dt) {
    t += dt;
    tNow = t;
    ti = still ? 4 : Math.min(ti + Math.min(real, 0.3) * introSpeed, 4);   // intro follows wall-clock time so slow devices still finish in ~3s
    frameN++;

    // smoothed pointer / scroll / hover
    mx += (px - mx) * 0.045;
    my += (py - my) * 0.045;
    hover += (hoverT - hover) * 0.08;
    scrollP += (scrollT - scrollP) * 0.08;
    clickAge += dt;
    const burstAmt = clickAge < 0.9 ? Math.sin((Math.PI * clickAge) / 0.9) : 0;
    const pulseAmt = clickAge < 2 ? Math.exp(-clickAge * 4.5) : 0;

    // intro timeline (matches the page timeline: 0 to 3s, then idle)
    const eAssemble = easeOut((ti - 1.0) / 1.0);
    const eRibbon = easeOut((ti - 0.9) / 1.2);
    const eGlass = easeOut((ti - 1.0) / 1.0);
    const eRings = easeOut((ti - 1.1) / 1.2);
    const eArt = easeOut((ti - 1.6) / 1.0);
    const eCore = smooth(0, 0.45, ti);
    const eParts = smooth(0, 0.8, ti);
    const eFil = smooth(1.6, 2.5, ti);
    const eLight = smooth(2.3, 3.0, ti);
    if (!introPulsed && ti > 0.4) { introPulsed = true; spawnRipple(0.7, t); }

    // camera: slow cinematic drift + small pointer parallax + scroll pull-back + intro push-in
    const push = (1 - easeOut(ti / 2.4)) * 2.6;
    camera.position.set(
      mx * 0.55,
      0.7 + Math.sin(t * 0.15) * 0.5 - my * 0.35,
      CAM_Z + push + scrollP * 3.2
    );
    camera.lookAt(0, 0, 0);

    // rig placement
    rig.position.set(base.x, base.y + scrollP * 1.5, 0);
    rig.scale.setScalar(rigScale * (1 - scrollP * 0.12));
    rig.rotation.y = mx * 0.16;
    rig.rotation.x = my * 0.08;

    // sculpture: one slow ~22s revolution, light wobble, secondary parts on their own clocks
    sculpt.rotation.y = t * (TAU / 22) + (1 - eAssemble) * 1.3;
    sculpt.rotation.x = 0.18 + Math.sin(t * 0.21) * 0.1;
    sculpt.rotation.z = -0.14 + mx * 0.05 * hover;

    // ribbon
    const rs = lerp(0.15, 1, eRibbon) * (1 + pulseAmt * 0.02);
    ribbonGroup.scale.setScalar(rs);
    ribbonGroup.visible = ti > 0.85;
    ribbonGroup.rotation.z = hover * mx * 0.22;
    if (ribbonGroup.visible && (!lite || frameN % 2 === 0 || still)) updateRibbon(t);

    // glass + outlines drawing themselves + frosted crystal
    glassGroup.scale.setScalar(lerp(0.55, 1, eGlass));
    glassGroup.rotation.y = Math.sin(t * 0.27) * 0.5;
    glassGroup.rotation.x = Math.sin(t * 0.19 + 1) * 0.3;
    glassMat.opacity = 0.26 * eGlass;
    frosted.opacity = 0.5 * eGlass;
    crystal.rotation.y = -t * 0.35;
    crystal.rotation.z = t * 0.12;
    edges.geometry.setDrawRange(0, Math.floor((smooth(0.4, 1.3, ti) * edgeVerts) / 2) * 2);

    // energy core
    const beat = 1 + Math.sin(t * 2.1) * 0.08 + pulseAmt * 0.5 + hover * 0.25;
    coreMesh.scale.setScalar((0.35 + 0.65 * eCore) * beat);
    coreHalo.scale.setScalar((1.2 + 2.4 * eCore) * beat);
    coreHalo.material.opacity = (0.55 + hover * 0.25 + pulseAmt * 0.3) * eCore;
    coreSpark.scale.setScalar((0.6 + 0.8 * eCore) * beat);
    coreSpark.material.opacity = 0.9 * eCore;
    // beam of light passing through the glass every ~10s
    const bp = ((t - 3.5) % 10) / 1.8;
    const beamOn = t > 3.5 && bp >= 0 && bp <= 1 ? Math.sin(Math.PI * bp) : 0;
    beam.position.x = lerp(-3.2, 3.2, bp > 0 && bp < 1 ? bp : 0);
    beamMat.opacity = beamOn * 0.42 * eLight;
    sheen.material.opacity = beamOn * 0.28 * eLight;
    sheen.position.x = beam.position.x * 0.4;
    coreLight.intensity = (14 + Math.sin(t * 2.1) * 5 + hover * 10 + pulseAmt * 30 + beamOn * 14) * eCore;

    // lighting settles at the end of the intro
    rim.intensity = 3.4 * eLight;
    key.intensity = lerp(0.8, 2.4, eLight);
    rear.intensity = 16 * eLight;

    // rings
    rings.forEach(r => {
      r.spin.rotation.z += dt * r.speed;
      r.tilt.scale.setScalar(Math.max(0.001, eRings));
    });

    // filaments + signal pulses
    filMat.opacity = (0.2 + hover * 0.15 + pulseAmt * 0.2) * eFil;
    if (hover > 0.45 && t - lastHoverFire > 0.45) {
      lastHoverFire = t;
      const f = filaments[Math.floor(Math.random() * filaments.length)];
      if (f.t < 0 || f.t > f.dur) f.t = 0;
    }
    for (let k = 0; k < filaments.length; k++) {
      const f = filaments[k];
      f.t += dt;
      if (f.t > f.dur * 1.15) f.t = -(1.6 + Math.random() * 3.6);
      const frac = f.t / f.dur;
      for (let j = 0; j < TRAIL; j++) {
        const o = (k * TRAIL + j) * 3;
        const ff = frac - j * 0.035;
        if (f.t < 0 || ff < 0 || ff > 1) {
          pulseCol[o] = pulseCol[o + 1] = pulseCol[o + 2] = 0;
          continue;
        }
        f.curve.getPoint(ff, tmpT);
        pulsePos[o] = tmpT.x; pulsePos[o + 1] = tmpT.y; pulsePos[o + 2] = tmpT.z;
        const b = Math.pow(1 - j / TRAIL, 1.6) * eFil * Math.sin(Math.PI * clamp(ff)) ** 0.5;
        pulseCol[o] = iceC.r * b; pulseCol[o + 1] = iceC.g * b; pulseCol[o + 2] = iceC.b * b;
      }
    }
    pulseGeo.attributes.position.needsUpdate = true;
    pulseGeo.attributes.color.needsUpdate = true;

    // fragments: free orbit <-> aligned to the ribbon, scaled in during the intro, pushed out on click
    [fragA, fragB].forEach((fr, set) => {
      const radiusK = 1 + (1 - eAssemble) * 2.6;
      for (let i = 0; i < fr.data.length; i++) {
        const d = fr.data[i];
        const th = d.th + d.sp * t;
        tmpV.set(
          d.r * Math.sin(d.ph) * Math.cos(th),
          d.r * Math.cos(d.ph) * 0.75 + Math.sin(t * 0.6 + d.al) * 0.08,
          d.r * Math.sin(d.ph) * Math.sin(th) * 0.8
        );
        const a = smooth(0.84, 1, Math.sin(t * 0.22 + d.al)) * 0.9;
        if (a > 0.001) {
          ribbonCurve.getPointAt((d.u + t * 0.01) % 1, tmpT);
          tmpV.lerp(tmpT, a);
        }
        tmpV.multiplyScalar(radiusK * (1 + burstAmt * (0.25 + d.s * 0.2)));
        dummy.position.copy(tmpV);
        dummy.rotation.set(t * d.spin[0] + set, t * d.spin[1], t * d.spin[2]);
        dummy.scale.setScalar(d.s * smooth(0.5 + d.em * 0.4, 1.3 + d.em * 0.4, ti) * (1 - a * 0.25));
        dummy.updateMatrix();
        fr.mesh.setMatrixAt(i, dummy.matrix);
      }
      fr.mesh.instanceMatrix.needsUpdate = true;
    });

    // artifacts float in front of the sculpture
    artifacts.forEach(g => {
      const u = g.userData;
      g.position.set(
        u.base[0] + Math.sin(t * 0.2 + u.i) * 0.3,
        u.base[1] + Math.sin(t * 0.45 + u.i * 1.7) * 0.14,
        u.base[2] + Math.cos(t * 0.17 + u.i) * 0.25
      );
      g.rotation.set(Math.sin(t * 0.4 + u.i) * 0.1 - my * 0.05, Math.sin(t * 0.23 + u.i * 2) * 0.35 + mx * 0.1, u.rz);
      g.scale.setScalar(u.s * Math.max(0.001, eArt) * (1 + burstAmt * 0.06));
    });

    // particles: drift upward, pointer pulls a few towards it, front layer leaves on scroll
    const attract = hover > 0.02;
    [back, front].forEach((p, li) => {
      const a = p.pos;
      for (let i = 0; i < p.count; i++) {
        const o = i * 3;
        a[o + 1] += p.vy[i] * dt;
        a[o] += Math.sin(t * 0.2 + p.ph[i]) * 0.12 * dt;
        if (a[o + 1] > 5.5) a[o + 1] = -5.5;
        if (attract && i < 90) {
          const dx = ptr.x - a[o], dy = ptr.y - a[o + 1], d2 = dx * dx + dy * dy;
          if (d2 < 6) {
            const f = hover * dt * 2.4 * (1 - d2 / 6);
            a[o] += dx * f; a[o + 1] += dy * f;
          }
        }
      }
      p.geo.attributes.position.needsUpdate = true;
      p.mat.opacity = p.opacity * eParts * (li === 1 ? 1 - scrollP : 1 - scrollP * 0.4);
    });
    field.position.x = -mx * 0.5;
    field.rotation.y = -mx * 0.04;

    // floor grid: visible only while the camera is above the floor plane
    grid.material.opacity = (0.03 + 0.15 * clamp((camera.position.y - 0.2) / 1.0)) * eLight * (1 - scrollP);
    pool.material.opacity = 0.42 * eCore * (1 - scrollP);

    // ripples: the intro pulse and click response
    ripples.forEach(r => {
      if (!r.m.visible) return;
      const p = (t - r.t0) / r.dur;
      if (p >= 1) { r.m.visible = false; return; }
      r.m.quaternion.copy(camera.quaternion);
      r.m.scale.setScalar(0.4 + p * 5.4);
      r.m.material.opacity = 0.7 * r.power * (1 - p) * (1 - p);
    });
  }

  /* ================= render loop ================= */
  let last = performance.now(), acc = 0, accN = 0;
  function draw(dt, real) {
    if (still && !draw.primed) { draw.primed = true; t = 3.2; }
    update(dt, real);
    renderer.render(scene, camera);
  }
  function frame() {
    const now = performance.now();
    const real = (now - last) / 1000;
    const dt = Math.min(real, 0.05);
    last = now;
    draw(dt, real);
    // adaptive pixel ratio: step down once if the device cannot hold ~45 fps
    acc += dt; accN++;
    if (accN === 90) {
      if (acc / accN > 0.024 && dprCap > 1) { dprCap = Math.max(1, Math.min(dpr, dprCap) - 0.25); layout(); }
      acc = 0; accN = 0;
    }
  }

  let inView = true, running = false;
  function sync() {
    if (still) return;
    const want = inView && !document.hidden;
    if (want && !running) { last = performance.now(); renderer.setAnimationLoop(frame); running = true; }
    else if (!want && running) { renderer.setAnimationLoop(null); running = false; }
  }
  const io = new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', sync);

  function dispose() {
    renderer.setAnimationLoop(null);
    running = false;
    io.disconnect(); ro.disconnect();
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    stage.removeEventListener('pointerdown', onDown);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('visibilitychange', sync);
    scene.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach(mm => { if (mm.map) mm.map.dispose(); mm.dispose(); });
    });
    if (scene.environment) scene.environment.dispose();
    glow.dispose();
    renderer.dispose();
    canvas.remove();
    hero.classList.remove('gl-on');
  }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dispose(); });

  layout();
  draw(0);                                  // first frame so the canvas never fades in empty
  sync();
  requestAnimationFrame(() => { canvas.classList.add('is-on'); hero.classList.add('gl-on'); });
  return { dispose };
}
