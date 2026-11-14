// 3D avtodrom: "ilon", estakada (qiyalikda to'xtab yurish) va garajga orqa bilan kirish.
// Birliklar: metr va soniya. Mashina boshida z=0 da turadi va -z yo'nalishiga qarab yuradi.
import * as THREE from "three";
import { GLTFLoader } from "./vendor/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/jsm/libs/meshopt_decoder.module.js";

// ---------- MASHINALAR (past poligonli, logotipsiz) ----------
// O'lchamlar (metr) ishlab chiqaruvchi va ma'lumotnoma saytlaridagi qiymatlar bo'yicha: uzunlik, kenglik, o'q oralig'i.
// model — 3D fayl (CC-BY-4.0, mualliflar CREDITS.md da), yaw — modelni oldi −z ga qaratish uchun burilish.
export const CARS = {
  gentra: { name: "Gentra", color: 0x111111, len: 4.515, wid: 1.725, wb: 2.6, acc: 2.9, type: "sedan", model: "gentra", yaw: 0 },
  cobalt: { name: "Cobalt", color: 0xf4f4f2, len: 4.479, wid: 1.735, wb: 2.62, acc: 3.0, type: "sedan", cabH: 0.52 },
  malibu: { name: "Malibu", color: 0xdcdcdc, len: 4.933, wid: 1.854, wb: 2.829, acc: 3.4, type: "sedan", model: "malibu", yaw: Math.PI },
  spark: { name: "Spark", color: 0xd8262f, len: 3.64, wid: 1.597, wb: 2.375, acc: 2.6, type: "hatch", cabH: 0.6 },
  damas: { name: "Damas", color: 0xfafafa, len: 3.485, wid: 1.4, wb: 1.84, acc: 2.2, type: "van", model: "damas", yaw: -Math.PI / 2 },
};

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const modelCache = {};
function loadModel(name) { return modelCache[name] ||= loader.loadAsync(`models/${name}.glb`).then(g => g.scene); }

// 3D modelni yuklab, real uzunlikka masshtablaydi va g guruhiga joylaydi
function attachModel(g, spec) {
  loadModel(spec.model).then(src => {
    const o = src.clone(true), piv = new THREE.Group();
    piv.add(o); piv.rotation.y = spec.yaw; piv.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(piv), size = box.getSize(new THREE.Vector3());
    const k = spec.len / Math.max(size.x, size.z); piv.scale.setScalar(k); piv.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(piv), c = b2.getCenter(new THREE.Vector3());
    piv.position.set(-c.x, -b2.min.y, -c.z);
    g.add(piv); g.remove(g.placeholder);
  }).catch(() => {});   // yuklanmasa, oddiy model qoladi
}

// Yon profil [z, y] nuqtalaridan (old tomoni −z) kenglik bo'yicha cho'zilgan jism yasaydi
function prism(pts, width, mat) {
  const s = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(-z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  g.rotateY(Math.PI / 2); g.translate(-width / 2, 0, 0);
  return new THREE.Mesh(g, mat);
}

function profiles(spec) {
  const L = spec.len, h = L / 2, top = (spec.type === "van" ? 0.95 : 0.86) + spec.cabH;
  if (spec.type === "sedan") return {
    body: [[-h, 0.34], [-h, 0.66], [-h + 0.15, 0.72], [-h + 1.0, 0.86], [h - 0.85, 0.9], [h - 0.1, 0.84], [h, 0.7], [h, 0.34]],
    glass: [[-L * 0.24, 0.86], [-L * 0.1, top], [L * 0.19, top], [L * 0.33, 0.88]], roof: [-L * 0.1, L * 0.19], top };
  if (spec.type === "hatch") return {
    body: [[-h, 0.34], [-h, 0.66], [-h + 0.15, 0.72], [-h + 0.75, 0.86], [h, 0.9], [h, 0.34]],
    glass: [[-L * 0.27, 0.86], [-L * 0.06, top], [L * 0.44, top], [L * 0.49, 0.9]], roof: [-L * 0.06, L * 0.44], top };
  return { // miniven
    body: [[-h, 0.3], [-h, 0.95], [h, 0.95], [h, 0.3]],
    glass: [[-h + 0.03, 0.95], [-h + 0.25, top], [h - 0.01, top], [h - 0.01, 0.95]], roof: [-h + 0.25, h - 0.01], top };
}

function carMesh(spec) {
  if (spec.model) {
    const g = new THREE.Group();
    g.placeholder = simpleCar({ ...spec, cabH: spec.type === "van" ? 0.9 : 0.5 }); g.add(g.placeholder);
    g.wheels = g.placeholder.wheels; g.brake = g.placeholder.brake;
    attachModel(g, spec);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(spec.wid * 1.15, spec.len * 1.05), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
    return g;
  }
  return simpleCar(spec);
}

function simpleCar(spec) {
  const g = new THREE.Group(), L = spec.len, W = spec.wid, P = profiles(spec);
  const paint = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b2633, roughness: 0.08, metalness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85 });
  g.add(prism(P.body, W, paint));
  g.add(prism(P.glass, W * 0.9, glass));
  const roof = prism([[P.roof[0], P.top], [P.roof[0], P.top + 0.05], [P.roof[1], P.top + 0.05], [P.roof[1], P.top]], W * 0.88, paint); g.add(roof);
  // ustunchalar (stoykalar)
  for (const sx of [-1, 1]) {
    const pil = prism([[P.glass[0][0], P.glass[0][1]], [P.glass[1][0], P.top], [P.glass[1][0] + 0.08, P.top], [P.glass[0][0] + 0.1, P.glass[0][1]]], 0.04, paint);
    pil.position.x = sx * (W * 0.45); g.add(pil);
  }
  // bamperlar
  const bump = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.7 });
  for (const sz of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(W * 1.01, 0.16, 0.12), bump); b.position.set(0, 0.4, sz * (L / 2 - 0.02)); g.add(b); }
  // g'ildiraklar
  const wg = new THREE.CylinderGeometry(0.31, 0.31, 0.22, 18); wg.rotateZ(Math.PI / 2);
  const rimM = new THREE.MeshStandardMaterial({ color: 0xa7adb3, metalness: 0.85, roughness: 0.25 });
  g.wheels = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = new THREE.Group(), tire = new THREE.Mesh(wg, black), rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.23, 10).rotateZ(Math.PI / 2), rimM);
    w.add(tire, rim); w.position.set(sx * (W / 2 - 0.1), 0.31, sz * spec.wb / 2); g.add(w); g.wheels.push(w);
    w.front = sz < 0;
  }
  // chiroqlar
  const head = new THREE.MeshStandardMaterial({ color: 0xfff7d6, emissive: 0xfff2b0, emissiveIntensity: 0.5 });
  g.brake = new THREE.MeshStandardMaterial({ color: 0x7a0b0b, emissive: 0xff0000, emissiveIntensity: 0.05 });
  const lightY = spec.type === "van" ? 0.75 : 0.62;
  for (const sx of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.05), head); hl.position.set(sx * (W / 2 - 0.26), lightY, -L / 2 - 0.01); g.add(hl);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), g.brake); bl.position.set(sx * (W / 2 - 0.2), lightY + 0.06, L / 2 + 0.01); g.add(bl);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  plate.position.set(0, 0.52, L / 2 + 0.03); g.add(plate);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.15, L * 1.05), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh);
  return g;
}

// ---------- AVTODROM SXEMASI ----------
const CONES = [{ z: -15, side: "L" }, { z: -24, side: "R" }, { z: -33, side: "L" }, { z: -42, side: "R" }];
const RAMP = { z0: -52, z1: -60, z2: -66, z3: -74, h: 1.2, halfW: 2.0, stop0: -65, stop1: -61 };
const GARAGE = { x0: 7, x1: 13, z0: -95.2, z1: -92.0 }; // ochiq tomoni yo'lga (x=7) qaragan
const PEN_LIMIT = 5, TIME_LIMIT = 240;

function rampHeight(x, z) {
  if (Math.abs(x) > RAMP.halfW) return 0;
  if (z <= RAMP.z0 && z > RAMP.z1) return RAMP.h * (RAMP.z0 - z) / (RAMP.z0 - RAMP.z1);
  if (z <= RAMP.z1 && z > RAMP.z2) return RAMP.h;
  if (z <= RAMP.z2 && z > RAMP.z3) return RAMP.h * (z - RAMP.z3) / (RAMP.z2 - RAMP.z3);
  return 0;
}
function onCourse(x, z) {
  if (z <= 6 && z >= -104 && Math.abs(x) <= 5) return true;          // asosiy yo'lak
  if (z <= -84 && z >= -104 && x >= -5 && x <= 14) return true;      // garaj oldi maydoni
  return false;
}

function buildWorld(scene) {
  scene.background = new THREE.Color(0x9fd3f5);
  scene.fog = new THREE.Fog(0x9fd3f5, 60, 160);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(20, 40, 10); scene.add(sun);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6aa84f }));
  grass.rotation.x = -Math.PI / 2; scene.add(grass);
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x55595f, roughness: 0.95 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const flat = (w, l, x, z, mat, y = 0.01) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); return m; };
  flat(10, 110, 0, -49, asphalt); flat(19, 20, 4.5, -94, asphalt, 0.012);
  // chegara chiziqlari
  flat(0.15, 90, -5, -39, white, 0.02); flat(0.15, 90, 5, -39, white, 0.02);
  flat(0.15, 20, -5, -94, white, 0.02); flat(9, 0.15, 9.5, -84, white, 0.02); flat(19, 0.15, 4.5, -104, white, 0.02);
  flat(0.15, 20, 14, -94, white, 0.022);
  // start chizig'i
  for (let i = 0; i < 10; i++) flat(0.5, 0.5, -4.5 + i, 3, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x111111 : 0xffffff }), 0.02);
  // konuslar
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6a00 }), band = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const cones = CONES.map(c => {
    const g = new THREE.Group();
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 16), coneMat); k.position.y = 0.35; g.add(k);
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.165, 0.1, 16), band); b.position.y = 0.4; g.add(b);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.5), coneMat); base.position.y = 0.02; g.add(base);
    g.position.set(0, 0, c.z); scene.add(g);
    // yo'nalish strelkasi
    const arrow = flat(1.2, 0.5, c.side === "L" ? -2.2 : 2.2, c.z, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }), 0.02);
    return { ...c, mesh: g, hit: false, passed: false, arrow };
  });
  // estakada
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb0aaa0, roughness: 0.9 });
  const rampGeo = (z0, z1, h0, h1) => {
    const len = Math.abs(z1 - z0), ang = Math.atan2(h1 - h0, len);
    const m = new THREE.Mesh(new THREE.BoxGeometry(RAMP.halfW * 2, 0.12, Math.hypot(len, h1 - h0)), concrete);
    m.position.set(0, (h0 + h1) / 2 - 0.06, (z0 + z1) / 2); m.rotation.x = ang; scene.add(m);
  };
  rampGeo(RAMP.z0, RAMP.z1, 0, RAMP.h); rampGeo(RAMP.z1, RAMP.z2, RAMP.h, RAMP.h); rampGeo(RAMP.z2, RAMP.z3, RAMP.h, 0);
  for (const sx of [-1, 1]) { // yon devorchalar
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.15, RAMP.h, RAMP.z1 - RAMP.z2), concrete);
    side.position.set(sx * RAMP.halfW, RAMP.h / 2, (RAMP.z1 + RAMP.z2) / 2); scene.add(side);
  }
  const yellow = new THREE.MeshBasicMaterial({ color: 0xffd600, transparent: true, opacity: 0.85 });
  flat(RAMP.halfW * 2, RAMP.stop1 - RAMP.stop0, 0, (RAMP.stop0 + RAMP.stop1) / 2, yellow, RAMP.h + 0.01);
  flat(RAMP.halfW * 2, 0.15, 0, RAMP.stop0, white, RAMP.h + 0.02);
  // garaj (qizil-oq ustunlar va to'siqlar)
  const red = new THREE.MeshStandardMaterial({ color: 0xd32f2f }), wht = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const post = (x, z) => { for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.15), i % 2 ? wht : red); p.position.set(x, 0.15 + i * 0.3, z); scene.add(p); } };
  const rail = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, len), red);
    r.position.set((x0 + x1) / 2, 0.9, (z0 + z1) / 2); r.rotation.y = Math.atan2(x1 - x0, z1 - z0); scene.add(r); };
  [[GARAGE.x0, GARAGE.z0], [GARAGE.x1, GARAGE.z0], [GARAGE.x0, GARAGE.z1], [GARAGE.x1, GARAGE.z1]].forEach(([x, z]) => post(x, z));
  rail(GARAGE.x0, GARAGE.z0, GARAGE.x1, GARAGE.z0); rail(GARAGE.x0, GARAGE.z1, GARAGE.x1, GARAGE.z1); rail(GARAGE.x1, GARAGE.z0, GARAGE.x1, GARAGE.z1);
  flat(GARAGE.x1 - GARAGE.x0, GARAGE.z1 - GARAGE.z0, (GARAGE.x0 + GARAGE.x1) / 2, (GARAGE.z0 + GARAGE.z1) / 2,
    new THREE.MeshBasicMaterial({ color: 0x2e7dd1, transparent: true, opacity: 0.35 }), 0.03);
  // atrof: daraxtlar, bino, bayroq
  const trunk = new THREE.MeshStandardMaterial({ color: 0x6d4c41 }), leaf = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
  for (let i = 0; i < 26; i++) {
    const x = (i % 2 ? 1 : -1) * (11 + (i * 7) % 9), z = 8 - i * 4.6;
    if (z < -82 && x > 0) continue;
    const t = new THREE.Group(), tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6), trunk); tr.position.y = 0.8;
    const lf = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.4, 8), leaf); lf.position.y = 3; t.add(tr, lf); t.position.set(x, 0, z); scene.add(t);
  }
  const bld = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 9), new THREE.MeshStandardMaterial({ color: 0xf1ede4 }));
  bld.position.set(-24, 3.5, -10); scene.add(bld);
  const roofB = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.5, 9.6), new THREE.MeshStandardMaterial({ color: 0x2e6fbd })); roofB.position.set(-24, 7.2, -10); scene.add(roofB);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9), new THREE.MeshStandardMaterial({ color: 0xcfd8dc })); pole.position.set(-12, 4.5, 2); scene.add(pole);
  [0x1eb4e6, 0xffffff, 0x1eb53a].forEach((c, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 1.8), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }));
    f.position.set(-12, 8.6 - i * 0.42, 2.95); scene.add(f); });
  // tartibga soluvchi (qo'llari yon tomonga yoyilgan — YHQ'dagi tartibga soluvchi signali)
  loadModel("police").then(src => {
    const o = src.clone(true), piv = new THREE.Group(); piv.add(o);
    const box = new THREE.Box3().setFromObject(piv), k = 1.8 / box.getSize(new THREE.Vector3()).y;
    piv.scale.setScalar(k); piv.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(piv), c = b2.getCenter(new THREE.Vector3());
    piv.position.set(-7 - c.x, -b2.min.y, -4 - c.z); scene.add(piv);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    stand.position.set(-7, 0.06, -4); scene.add(stand);
  }).catch(() => {});
  return cones;
}

// ---------- O'YIN ----------
const ui = id => document.getElementById(id);
const Drive = {
  keys: {}, run: false, camMode: 0, carId: "cobalt",
  init() {
    if (this.renderer) return;
    const cv = ui("cv");
    this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    this.cones = buildWorld(this.scene);
    addEventListener("resize", () => this.resize());
  },
  start(carId) {
    if (carId) this.carId = carId;
    this.init();
    ui("game").style.display = "block"; this.resize();
    const spec = CARS[this.carId];
    if (this.carObj) this.scene.remove(this.carObj);
    this.carObj = carMesh(spec); this.scene.add(this.carObj); this.spec = spec;
    this.car = { x: 0, z: 0, h: 0, v: 0, steer: 0, y: 0 };
    this.cones.forEach(c => { c.hit = false; c.passed = false; c.mesh.rotation.set(0, 0, 0); c.mesh.position.set(0, 0, c.z); });
    Object.assign(this, { t: 0, pen: 0, step: 0, log: [], stopZ: null, rolled: false, rampDone: false, wallHit: false, frontWarn: false, keys: {} });
    this.say("1-mashq: \"Ilon\" — konuslarni strelka ko'rsatgan tomondan aylanib o'ting");
    this.run = true; this.last = performance.now(); const gen = this.gen = (this.gen || 0) + 1;
    requestAnimationFrame(t => this.loop(t, gen));
  },
  resize() {
    if (!this.renderer) return;
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); ui("cv").style.width = w + "px"; ui("cv").style.height = h + "px";
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  },
  toggleCam() { this.camMode = (this.camMode + 1) % 3; },
  say(t) { const m = ui("hMsg"); m.textContent = t; m.style.display = "block"; this.msgT = 4; },
  penalty(p, why) {
    this.pen += p; this.log.push(why); this.say(`⚠️ ${why} (+${p})`);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("warning");
    if (this.pen > PEN_LIMIT) this.end(false, "Jarima ballari limitdan oshdi");
  },
  loop(now, gen) {
    if (!this.run || gen !== this.gen) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.update(dt); if (!this.run) return; this.render(dt);
    requestAnimationFrame(t => this.loop(t, gen));
  },
  fwd() { return [Math.sin(this.car.h), -Math.cos(this.car.h)]; },
  corners() {
    const c = this.car, [fx, fz] = this.fwd(), rx = -fz, rz = fx, L = this.spec.len / 2, W = this.spec.wid / 2;
    return [[L, W], [L, -W], [-L, W], [-L, -W]].map(([a, b]) => [c.x + fx * a + rx * b, c.z + fz * a + rz * b]);
  },
  update(dt) {
    const c = this.car, k = this.keys, s = this.spec;
    this.t += dt;
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) ui("hMsg").style.display = "none";
    // fizika
    const [fx, fz] = this.fwd();
    const hF = rampHeight(c.x + fx * s.wb / 2, c.z + fz * s.wb / 2), hR = rampHeight(c.x - fx * s.wb / 2, c.z - fz * s.wb / 2);
    const slope = Math.atan2(hF - hR, s.wb);                 // >0 — tepaga qarab turibdi
    const hold = k.brake && !k.gas && !k.reverse && Math.abs(c.v) < 0.05;   // tormoz bosilgan holda turibdi
    if (k.gas) c.v = c.v < 0 ? c.v + 6 * dt : Math.min(8, c.v + s.acc * dt);
    else if (k.reverse) c.v = c.v > 0.05 ? c.v - 6 * dt : Math.max(-2.5, c.v - 1.6 * dt);
    else if (k.brake) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 6 * dt);
    else c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 0.6 * dt);
    if (hold) c.v = 0; else c.v -= 9.8 * Math.sin(slope) * dt * 0.75;          // qiyalikda orqaga ketish
    const target = k.left ? -0.55 : k.right ? 0.55 : 0;
    c.steer += (target - c.steer) * Math.min(1, dt * 6);
    c.h += (c.v / s.wb) * Math.tan(c.steer) * dt;
    c.x += Math.sin(c.h) * c.v * dt; c.z -= Math.cos(c.h) * c.v * dt;
    c.y = (hF + hR) / 2; c.pitch = slope;
    const corners = this.corners();
    // maydondan chiqish
    if (corners.some(([x, z]) => !onCourse(x, z))) return this.end(false, "Mashina avtodrom chegarasidan chiqib ketdi");
    // estakadadan yiqilish
    const onRampZ = c.z < RAMP.z0 - 1 && c.z > RAMP.z3 + 1;
    if (onRampZ && c.y > 0.3 && Math.abs(c.x) > RAMP.halfW - 0.6) return this.end(false, "Estakadadan tushib ketdingiz");
    if (this.step === 1 && c.z < RAMP.z1 && c.z > RAMP.z2 && c.y < 0.3)
      return this.end(false, "Estakada mashqi bajarilmadi (aylanib o'tildi)");
    // 1) ilon
    for (const cn of this.cones) {
      const near = corners.some(([x, z]) => Math.hypot(x, z - cn.z) < 0.45) || Math.hypot(c.x, c.z - cn.z) < s.wid / 2 + 0.2;
      if (!cn.hit && near) {
        cn.hit = true; cn.mesh.rotation.z = Math.PI / 2.2; cn.mesh.position.x += 0.4; this.penalty(3, "Konusni urib yubordingiz");
      }
      if (!cn.passed && c.z < cn.z) {
        cn.passed = true;
        if (cn.side === "L" ? c.x > 0 : c.x < 0) this.penalty(3, `Konusni ${cn.side === "L" ? "chap" : "o'ng"} tomondan aylanish kerak edi`);
      }
    }
    if (this.step === 0 && this.cones.every(x => x.passed)) { this.step = 1; this.say("2-mashq: estakadaga chiqing va sariq zonada to'xtang"); }
    // 2) estakada
    if (this.step === 1) {
      const frontZ = c.z + fz * s.len / 2;
      if (this.stopZ === null && Math.abs(c.v) < 0.05 && c.y > RAMP.h - 0.1 && frontZ <= RAMP.stop1 && frontZ >= RAMP.stop0) {
        this.stopZ = c.z; this.say("✅ To'xtadingiz. Endi orqaga ketmasdan yo'lda davom eting");
      }
      if (this.stopZ !== null && !this.rolled && c.z - this.stopZ > 0.3) { this.rolled = true; this.penalty(3, "Estakadada orqaga ketib qoldingiz"); }
      if (frontZ < RAMP.stop0 - 0.3 && this.stopZ === null && !this.rampDone) { this.rampDone = true; this.penalty(3, "Sariq zonada to'xtamadingiz"); }
      if (c.z < RAMP.z3 - 2) { this.step = 2; this.say("3-mashq: garajdan o'tib, unga ORQA bilan kiring va to'xtang"); }
    }
    // 3) garaj
    if (this.step === 2) {
      const inBox = ([x, z]) => x > GARAGE.x0 && x < GARAGE.x1 && z > GARAGE.z0 && z < GARAGE.z1;
      const hitWall = corners.some(([x, z]) =>
        (x > GARAGE.x0 - 0.1 && x < GARAGE.x1 + 0.1 && (Math.abs(z - GARAGE.z0) < 0.12 || Math.abs(z - GARAGE.z1) < 0.12)) ||
        (Math.abs(x - GARAGE.x1) < 0.12 && z > GARAGE.z0 && z < GARAGE.z1));
      if (hitWall && !this.wallHit) this.penalty(3, "Garaj to'sig'iga tegdingiz");
      this.wallHit = hitWall;
      if (corners.every(inBox) && Math.abs(c.v) < 0.05) {
        const facingOut = Math.sin(c.h) < -0.85;   // old tomoni yo'lga (−x) qaragan
        if (facingOut) return this.end(true);
        if (!this.frontWarn) { this.frontWarn = true; this.say("Garajga ORQA bilan kirish kerak — chiqib, qaytadan kiring"); }
      }
    }
    if (this.t > TIME_LIMIT) return this.end(false, `Vaqt tugadi (${TIME_LIMIT / 60} daqiqa)`);
    ui("hTime").textContent = `⏱ ${this.t.toFixed(0)} s`;
    ui("hStep").textContent = `${Math.round(Math.abs(c.v) * 3.6)} km/soat · ${Math.min(this.step + 1, 3)}/3`;
    ui("hPen").textContent = `Jarima: ${this.pen}/${PEN_LIMIT}`;
  },
  render(dt) {
    const c = this.car, o = this.carObj;
    o.position.set(c.x, c.y, c.z); o.rotation.set(0, 0, 0); o.rotateY(-c.h); o.rotateX(c.pitch || 0);
    o.wheels.forEach(w => { if (w.front) w.rotation.y = -c.steer; w.children.forEach(m => m.rotation.x -= c.v * dt / 0.31); });
    o.brake.emissiveIntensity = this.keys.brake ? 1.2 : 0.05;
    const [fx, fz] = this.fwd(), cam = this.camera;
    let tp, look;
    if (this.camMode === 0) { tp = new THREE.Vector3(c.x - fx * 7, c.y + 3.2, c.z - fz * 7); look = new THREE.Vector3(c.x + fx * 4, c.y + 0.8, c.z + fz * 4); }
    else if (this.camMode === 1) { tp = new THREE.Vector3(c.x, c.y + 18, c.z + 0.01); look = new THREE.Vector3(c.x, 0, c.z); }
    else { tp = new THREE.Vector3(c.x + fx * 0.2, c.y + 1.25, c.z + fz * 0.2); look = new THREE.Vector3(c.x + fx * 10, c.y + 1, c.z + fz * 10); }
    if (this.camMode === 2) cam.position.copy(tp); else cam.position.lerp(tp, Math.min(1, dt * 5));
    cam.lookAt(look);
    this.carObj.visible = this.camMode !== 2;
    this.renderer.render(this.scene, cam);
  },
  async end(passed, reason) {
    if (!this.run) return; this.run = false;
    const time = Math.round(this.t);
    if (passed && window.api) { try { window.setMe(await window.api("/api/result", { kind: "drive", passed: true, time })); } catch (e) {} }
    ui("game").style.display = "none";
    window.showDriveResult(passed, reason, time, this.pen, PEN_LIMIT);
  },
  stop() { this.run = false; ui("game").style.display = "none"; window.home(); },
};
window.Drive = Drive;
window.CARS = CARS;
