// 3D avtodrom: "B" toifa mashqlari IIV 27-son buyrug'i (2024) talablari bo'yicha.
// Birliklar: metr va soniya. Mashina boshida -z (shimol) yo'nalishiga qarab turadi.
import * as THREE from "three";
import { GLTFLoader } from "./vendor/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/jsm/libs/meshopt_decoder.module.js";
import { Sky } from "./vendor/jsm/objects/Sky.js";

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
// Manba: IIV vazirining 2024-yil 18-yanvardagi 27-son buyrug'i (Adliya vazirligida 01.02.2024, 3494-son ro'yxatga olingan),
// "O'quv avtodromiga qo'yiladigan talablar": 3-band (mashqlar ketma-ketligi), 4-ilova 2-bob ("B" toifa o'lchamlari).
// Sxemalardagi belgilar: V — mashinaning gabarit kengligi, D — gabarit uzunligi, K — g'ildirak koleyasi.
const PX = 10;              // yer teksturasi: 1 m = 10 piksel
const MAX_ERR = 3;          // o'yin sharti: 3-xatoda imtihon to'xtaydi
const TIME_LIMIT = 900;     // 15 daqiqa
const STEER = 0.66;         // old g'ildiraklarning eng katta burilish burchagi (≈38°; burilish diametri ≈ 10,5–12 m)
const KMH = 3.6;

// lokal koordinatalar: f = {x, z, h} — nuqta va yo'nalish; u — o'ngga, v — oldinga (metr)
const L2W = (f, u, v) => [f.x + Math.cos(f.h) * u + Math.sin(f.h) * v, f.z + Math.sin(f.h) * u - Math.cos(f.h) * v];
const W2L = (f, x, z) => { const dx = x - f.x, dz = z - f.z; return [dx * Math.cos(f.h) + dz * Math.sin(f.h), dx * Math.sin(f.h) - dz * Math.cos(f.h)]; };
const adv = (f, u, v, dh = 0) => { const [x, z] = L2W(f, u, v); return { x, z, h: f.h + dh }; };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- YO'L BELGILARI (soddalashtirilgan rasm) ----------
const signTex = {};
function signTexture(type) {
  if (signTex[type]) return signTex[type];
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d");
  const circle = (fill, ring, r2 = 47) => { g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fillStyle = ring; g.fill(); g.beginPath(); g.arc(64, 64, r2, 0, 7); g.fillStyle = fill; g.fill(); };
  const tri = () => { g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 112); g.lineTo(6, 112); g.closePath(); g.fillStyle = "#d32f2f"; g.fill();
    g.beginPath(); g.moveTo(64, 32); g.lineTo(102, 100); g.lineTo(26, 100); g.closePath(); g.fillStyle = "#fff"; g.fill(); };
  const txt = (t, size, col, y = 66) => { g.fillStyle = col; g.font = `bold ${size}px sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, 64, y); };
  const stroke = (pts, w = 6, col = "#111") => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineWidth = w; g.strokeStyle = col; g.lineJoin = "round"; g.stroke(); };
  const walker = (dx = 0, col = "#111") => { g.fillStyle = col; g.beginPath(); g.arc(64 + dx, 40, 7, 0, 7); g.fill();
    stroke([[64 + dx, 48], [62 + dx, 72]], 7, col); stroke([[62 + dx, 72], [52 + dx, 92]], 6, col); stroke([[62 + dx, 72], [74 + dx, 92]], 6, col);
    stroke([[63 + dx, 54], [50 + dx, 66]], 5, col); stroke([[63 + dx, 54], [76 + dx, 64]], 5, col); };
  if (type.startsWith("3.24")) { circle("#fff", "#d32f2f"); txt(type.split("-")[1], 50, "#111"); }
  else if (type.startsWith("4.7")) { circle("#1565c0", "#fff", 55); txt(type.split("-")[1], 50, "#fff", 60); stroke([[42, 88], [86, 88]], 5, "#fff"); }
  else if (type === "5.16") { g.fillStyle = "#1565c0"; g.fillRect(4, 4, 120, 120); g.beginPath(); g.moveTo(64, 14); g.lineTo(116, 112); g.lineTo(12, 112); g.closePath(); g.fillStyle = "#fff"; g.fill();
    g.fillStyle = "#111"; for (let i = 0; i < 4; i++) g.fillRect(40 + i * 13, 98, 7, 10); walker(0); }
  else if (type === "5.15") { g.fillStyle = "#1565c0"; g.fillRect(4, 4, 120, 120); txt("P", 90, "#fff", 68); }
  else if (type === "1.14" || type === "1.13") { tri(); g.beginPath(); if (type === "1.14") { g.moveTo(36, 96); g.lineTo(92, 96); g.lineTo(92, 64); } else { g.moveTo(36, 64); g.lineTo(36, 96); g.lineTo(92, 96); }
    g.closePath(); g.fillStyle = "#111"; g.fill(); txt("16%", 22, "#111", 52); }
  else if (type === "1.12.2") { tri(); stroke([[56, 98], [56, 80], [76, 64], [56, 46]], 7); }
  else if (type === "1.12.1") { tri(); stroke([[72, 98], [72, 80], [52, 64], [72, 46]], 7); }
  else if (type === "1.2") { tri(); g.fillStyle = "#111"; g.fillRect(36, 70, 52, 22); g.fillRect(70, 56, 18, 14); g.fillRect(40, 58, 8, 12);
    g.beginPath(); g.arc(46, 95, 6, 0, 7); g.arc(78, 95, 6, 0, 7); g.fill(); }
  else if (type === "1.3.1") { g.translate(64, 64); for (const a of [0.6, -0.6]) { g.save(); g.rotate(a); g.fillStyle = "#d32f2f"; g.fillRect(-60, -11, 120, 22);
    g.fillStyle = "#fff"; for (let i = -54; i < 54; i += 36) g.fillRect(i, -8, 18, 16); g.restore(); } }
  else if (type === "2.5") { g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(64 + 60 * Math.cos(a), 64 + 60 * Math.sin(a)); }
    g.closePath(); g.fillStyle = "#fff"; g.fill(); g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(64 + 54 * Math.cos(a), 64 + 54 * Math.sin(a)); }
    g.closePath(); g.fillStyle = "#d32f2f"; g.fill(); txt("STOP", 34, "#fff"); }
  return (signTex[type] = new THREE.CanvasTexture(cv));
}

// ---------- AVTODROMNI QURISH (mashina o'lchamiga qarab — 16-band) ----------
function makeCourse(spec) {
  const V = spec.wid, D = spec.len, K = V - 0.25;
  const W = Math.max(3.0, Math.floor(V * 2.5 * 10) / 10);    // mashq yo'laklari: 2÷2,5·V (rasmiy oraliqning yuqori chegarasi)
  const RW = Math.max(3.5, W);                              // oddiy yo'l: kamida 3,0 m (2-bob 6-band)
  const shapes = [], paints = [], mods = [], lights = [], ramps = [], path = [];
  const root = new THREE.Group();
  const grp = f => { const g = new THREE.Group(); g.position.set(f.x, 0, f.z); g.rotation.y = -f.h; root.add(g); return g; };
  const rect = (f, u0, u1, v0, v1, z = 0) => shapes.push({ t: "r", f, u0, u1, v0, v1, z });
  const ann = (f, cu, cv, r0, r1, a0, a1, z = 0) => shapes.push({ t: "a", f, cu, cv, r0, r1, a0, a1, z });
  const fil = (f, cu, cv, du, dv, r, z = 0) => shapes.push({ t: "f", f, cu, cv, du, dv, r, z });
  const paint = (f, fn) => paints.push({ f, fn });
  const pts = (f, list, o = {}) => list.forEach(([u, v]) => { const [x, z] = L2W(f, u, v); path.push({ x, z, ...o }); });
  const M = o => { o.st = {}; mods.push(o); return o; };
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const box = (g, w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  const poleMat = mat(0x9aa3a8), backMat = mat(0xb0b5b8);
  // belgi: lokal (u, v) nuqtada, kelayotgan haydovchiga qaragan; back=true — teskari yo'nalishga
  const sign = (f, u, v, types, back = false) => {
    const g = grp(f), s = new THREE.Group(); s.position.set(u, 0, -v); if (back) s.rotation.y = Math.PI; g.add(s);
    box(s, 0.07, 2.2 + 0.7 * (types.length - 1), 0.07, 0, 1.1 + 0.35 * (types.length - 1), 0, poleMat);
    types.forEach((t, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: signTexture(t), transparent: true }));
      m.position.set(0, 2.3 + 0.72 * (types.length - 1 - i), 0.05); s.add(m);
      const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.66), backMat); bk.rotation.y = Math.PI; bk.position.set(0, m.position.y, 0.03); s.add(bk); });
    return s;
  };
  // chizish yordamchilari (lokal metrlarda)
  const D_ = {
    bar(c, u0, v0, u1, v1, col) { c.fillStyle = col; c.fillRect(Math.min(u0, u1), Math.min(v0, v1), Math.abs(u1 - u0), Math.abs(v1 - v0)); },
    dashU(c, u0, u1, v, w, col, s = 0.5) { c.fillStyle = col; for (let u = u0; u < u1; u += 2 * s) c.fillRect(u, v - w / 2, Math.min(s, u1 - u), w); },
    dashV(c, u, v0, v1, w, col, s = 0.5) { c.fillStyle = col; for (let v = v0; v < v1; v += 2 * s) c.fillRect(u - w / 2, v, w, Math.min(s, v1 - v)); },
    zebra(c, u0, u1, v0, v1) { c.fillStyle = "#f4f4f4"; for (let u = u0 + 0.25; u < u1 - 0.3; u += 1.0) c.fillRect(u, v0, 0.5, v1 - v0); },  // 1.14.1
    zebraU(c, u0, u1, v0, v1) { c.fillStyle = "#f4f4f4"; for (let v = v0 + 0.25; v < v1 - 0.3; v += 1.0) c.fillRect(u0, v, u1 - u0, 0.5); },
    text(c, s, u, v, h, col = "#fff", rot = 0) { c.save(); c.translate(u, v); c.scale(1 / 40, -1 / 40); c.rotate(rot); c.fillStyle = col;
      c.font = `bold ${h * 40}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, 0, 0); c.restore(); },
  };
  const YEL = "#f2c200", WHT = "#ffffff";
  let P = { x: 0, z: 0, h: 0 };
  const road = (len, zone = 0) => { const f = P; rect(f, -RW / 2, RW / 2, 0, len, zone); pts(f, [[0, len]]); P = adv(f, 0, len); return f; };
  const exitAt = (o, fe) => { o.fe = fe; return o; };

  // 1. Harakatni boshlash (START) — 2-bob 7–10-bandlar
  { const f = P; rect(f, -RW / 2, RW / 2, -D - 3, 12);
    paint(f, c => { D_.bar(c, -RW / 2, 0, RW / 2, 0.4, WHT); D_.dashU(c, -RW / 2, RW / 2, 10, 0.15, YEL); D_.text(c, "START", -RW / 2 - 1.9, 0.6, 0.8, WHT, -Math.PI / 2); });
    sign(f, RW / 2 + 0.8, 10, ["3.24-20"]);
    pts(f, [[0, 0], [0, 12]]); P = adv(f, 0, 12);
    exitAt(M({ id: "start", name: "Harakatni boshlash (START)", tick(d) {   // YHQ 45-band: harakatni boshlashdan oldin ishora
      const st = this.st; if (d.ctl.sigL) st.sig = true;
      if (!st.moved && Math.abs(d.car.v) > 0.3) { st.moved = true; if (!st.sig) d.err("45-band: harakatni boshlashdan oldin chap burilish chirog'ini yoqmadingiz"); }
    } }), P); }

  // 2. Piyodalar o'tish joyi — 14-band (5.16 belgilari, 1.14.1 chizig'i)
  { const f = P; rect(f, -RW / 2, RW / 2, 0, 10);
    paint(f, c => D_.zebra(c, -RW / 2, RW / 2, 4, 7));
    sign(f, RW / 2 + 0.8, 4, ["5.16"]); sign(f, -RW / 2 - 0.8, 4, ["5.16"]);
    const g = grp(f), ped = new THREE.Group();
    const cloth = mat(0x1e88e5), skin = mat(0xd7a679), dark = mat(0x333333);
    box(ped, 0.42, 0.62, 0.26, 0, 1.18, 0, cloth); const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin); head.position.y = 1.62; ped.add(head);
    const legs = [-0.1, 0.1].map(x => { const l = box(ped, 0.14, 0.86, 0.16, x, 0.43, 0, dark); l.geometry.translate(0, -0.43, 0); l.position.y = 0.86; return l; });
    ped.position.set(-RW / 2 - 2, 0, -5.5); ped.rotation.y = -Math.PI / 2; g.add(ped);
    pts(f, [[0, 10]]); P = adv(f, 0, 10);
    exitAt(M({ id: "zebra", name: "Piyodalar o'tish joyi", ped, f, tick(d, dt) {
      const st = this.st, fr = W2L(f, ...d.front()), rr = W2L(f, ...d.rear());
      if (!st.go && fr[1] > -7) st.go = true;
      if (st.go && ped.position.x < RW / 2 + 2) { ped.position.x += 1.3 * dt; st.ph = (st.ph || 0) + dt * 7; legs[0].rotation.x = Math.sin(st.ph) * 0.5; legs[1].rotation.x = -Math.sin(st.ph) * 0.5; }
      const onRoad = ped.position.x > -RW / 2 - 0.3 && ped.position.x < RW / 2 + 0.3;
      if (onRoad && fr[1] > 4 && rr[1] < 7 && !st.err) { st.err = true; d.err("Piyodalar o'tish joyida piyodaga yo'l bermadingiz"); }
    } }), P); }

  // 3. To'xtash va tik balandlikka ko'tarilish (estakada) — 11–13-bandlar
  { const f = P, s = 0.16, a = 6 / Math.hypot(1, s), H = a * s, v0 = 4, v1 = v0 + a, v2 = v1 + 4, v3 = v2 + a, cs = 1 / Math.hypot(1, s);
    const L0 = v1 - 1.4 * cs, L1 = v1 - 1.0 * cs;          // 1.12 to'xtash chizig'i: eni 0,4 m, ko'tarilish oxirigacha 1,0 m
    rect(f, -RW / 2, RW / 2, 0, 24);
    const hAt = v => v <= v0 ? 0 : v <= v1 ? (v - v0) * s : v <= v2 ? H : v <= v3 ? (v3 - v) * s : 0;
    ramps.push({ f, hw: RW / 2 + 0.1, v0, v3, hAt });
    const g = grp(f), conc = mat(0xb9b3a8), bar = mat(0xd84315), wbar = mat(0xf5f5f5);
    const slab = (va, vb, ha, hb) => { const len = Math.hypot(vb - va, hb - ha), m = box(g, RW, 0.14, len, 0, (ha + hb) / 2 - 0.07, -(va + vb) / 2, conc); m.rotation.x = Math.atan2(hb - ha, vb - va); return m; };
    slab(v0, v1, 0, H); slab(v1, v2, H, H); slab(v2, v3, H, 0);
    // himoya to'siqlari: balandligi 0,5 m, qalinligi 0,3 m (12-band), chiziqdan 0,1 m nari (6-band)
    for (const sx of [-1, 1]) for (const [va, vb, ha, hb] of [[v0 - 1, v0, 0, 0], [v0, v1, 0, H], [v1, v2, H, H], [v2, v3, H, 0], [v3, v3 + 1, 0, 0]]) {
      const len = Math.hypot(vb - va, hb - ha), n = Math.max(1, Math.round(len / 1));
      for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, vm = va + (vb - va) * (t0 + t1) / 2, hm = ha + (hb - ha) * (t0 + t1) / 2;
        const m = box(g, 0.3, 0.5, len / n, sx * (RW / 2 + 0.25), hm + 0.25, -vm, i % 2 ? wbar : bar); m.rotation.x = Math.atan2(hb - ha, vb - va); } }
    const line = box(g, RW, 0.02, 0.4, 0, 0, 0, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    line.position.set(0, ((L0 + L1) / 2 - v0) * s + 0.005, -(L0 + L1) / 2); line.rotation.x = Math.atan2(s, 1);
    sign(f, RW / 2 + 1.0, v0 - 3, ["1.14"]); sign(f, RW / 2 + 1.0, v2 - 3, ["1.13"]);
    pts(f, [[0, L0 - 0.3]], { stopFront: L0 - 0.25, hold: 1.5 }); pts(f, [[0, 24]]); P = adv(f, 0, 24);
    exitAt(M({ id: "ramp", name: "Estakada (tik balandlikda to'xtab, joyidan qo'zg'alish)", line: L0, f, tick(d, dt) {
      const st = this.st, fv = W2L(f, ...d.front())[1], cvv = W2L(f, d.car.x, d.car.z)[1];
      if (st.stop == null) {
        if (Math.abs(d.car.v) < 0.05 && fv <= L0 && fv >= L0 - 2.0 && cvv > v0) { st.t = (st.t || 0) + dt; if (st.t > 0.5) { st.stop = cvv; d.say("✅ To'xtadingiz. Endi orqaga ketmasdan joyidan qo'zg'aling"); } }
        else st.t = 0;
        if (fv > L0 + 0.05 && !st.miss) { st.miss = true; d.err("Estakadada to'xtash chizig'i oldida to'xtamadingiz"); }
      } else if (!st.roll && st.stop - cvv > 0.3) { st.roll = true; d.err("Estakadada orqaga ketib qoldingiz (0,3 m dan ko'p)"); }
    } }), P); }

  road(6);
  // 4. 90 gradus burchak ostida burilishlar ("B" toifa sxemasi: 11,5 m, R 1 m, yo'lak 2÷2,5·V) — 15-band
  { const f = P, T = 11.5;
    rect(f, -W / 2, W / 2, 0, D + W, 1); rect(f, W / 2 - T, W / 2, D, D + W, 1); rect(f, W / 2 - T, W / 2 - T + W, D, 2 * D + W, 1);
    fil(f, -W / 2, D, -1, -1, 1, 1); fil(f, 1.5 * W - T, D + W, 1, 1, 1, 1);
    paint(f, c => { D_.dashU(c, -W / 2, W / 2, 0.1, 0.15, YEL, 0.25); D_.dashU(c, W / 2 - T, W / 2 - T + W, 2 * D + W - 0.1, 0.15, YEL, 0.25); });
    sign(f, RW / 2 + 0.8, -3, ["1.12.2"]);
    const cu = W - T;  // chiqish o'qi
    pts(f, [[0, 0.5], [0.15 * W, D + 0.1 * W], [cu * 0.5, D + W * 0.5], [cu - 0.15 * W, D + 0.9 * W], [cu, 2 * D + W]], { spd: 2.2 });
    P = adv(f, cu, 2 * D + W);
    exitAt(M({ id: "turn90", name: "90 gradus burchak ostida burilishlar", f, T }), P); }

  road(6);
  // 5–6. Boks va chorraha. Chorraha: burilish radiusi > 4,0 m, 1.12 chizig'i 0,4 m, piyodalar o'tish joyi — 19-band
  const La = 12, Lw = 22, Lb = 12, Rx = 4.5;
  const X = P;
  { const f = X, sq0 = La, sq1 = La + RW;
    rect(f, -RW / 2, RW / 2, 0, sq1 + Lb); rect(f, -RW / 2 - Lw, RW / 2 + 6, sq0, sq1);
    fil(f, RW / 2, sq0, 1, -1, Rx); fil(f, -RW / 2, sq0, -1, -1, Rx); fil(f, RW / 2, sq1, 1, 1, Rx); fil(f, -RW / 2, sq1, -1, 1, Rx);
    const zS = [sq0 - Rx - 1 - 3, sq0 - Rx - 1], zN = [sq1 + Rx + 1, sq1 + Rx + 4];
    const stopS = zS[0] - 1.0 - 0.4, stopN = zN[1] + 1.0 + 0.4;   // to'xtash chizig'i — piyodalar yo'lagidan kamida 1,0 m oldin
    paint(f, c => { D_.zebra(c, -RW / 2, RW / 2, zS[0], zS[1]); D_.zebra(c, -RW / 2, RW / 2, zN[0], zN[1]);
      D_.zebraU(c, -RW / 2 - Rx - 4, -RW / 2 - Rx - 1, sq0, sq1);
      D_.bar(c, -RW / 2, stopS, RW / 2, stopS + 0.4, WHT); D_.bar(c, -RW / 2, stopN - 0.4, RW / 2, stopN, WHT); });
    // svetoforlar: shimolga va janubga harakat uchun bitta faza
    const mkLight = (u, v, back) => { const g = grp(f), s = new THREE.Group(); s.position.set(u, 0, -v); if (back) s.rotation.y = Math.PI; g.add(s);
      box(s, 0.1, 2.4, 0.1, 0, 1.2, 0, poleMat); box(s, 0.36, 0.95, 0.24, 0, 2.75, 0, mat(0x222222));
      const lamps = [0xff2a2a, 0xffc400, 0x22dd55].map((col, i) => { const m = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: col, emissiveIntensity: 0.05 });
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), m); l.position.set(0, 3.05 - i * 0.3, 0.13); s.add(l); return m; });
      return lamps; };
    const lampsS = mkLight(RW / 2 + 0.7, stopS, false), lampsN = mkLight(-RW / 2 - 0.7, stopN, true);
    const off = Math.random() * 20;
    const L = { f, stopS, stopN, phase(t) { const k = (t + off) % 20; return k < 9 ? "green" : k < 12 ? "yellow" : "red"; },
      show(t) { const p = this.phase(t); [lampsS, lampsN].forEach(ls => ls.forEach((m, i) => m.emissiveIntensity = (["red", "yellow", "green"][i] === p) ? 2.2 : 0.05)); } };
    lights.push(L);
    // sharq tomoni berk: 3.1 "Kirish taqiqlangan"
    const gs = grp(f); for (let i = 0; i < 4; i++) box(gs, 0.25, 0.8, RW / 4 - 0.05, RW / 2 + 5.7, 0.4, -(sq0 + RW / 8 + i * RW / 4), i % 2 ? mat(0xffffff) : mat(0xd32f2f));
    pts(f, [[0, sq1 + Lb]], {});
    M({ id: "cross1", hide: true, name: "Chorraha", msg: "Chorrahadan to'g'riga o'tib, boksga boring (svetoforga e'tibor bering)", fe: adv(f, 0, sq1 + Lb), tick(d) {
      if (W2L(f, d.car.x, d.car.z)[0] < -RW / 2 - 2) d.end(false, "Marshrutdan chetga chiqdingiz: avval boks mashqini bajaring");
    } });
    P = adv(f, 0, sq1 + Lb);
  }

  // 5. Tor joyda qayrilib olish uchun boksga kirish ("B" toifa: R 1 m; boks chuqurligi D+1, kengligi 2÷2,5·V) — 17-band
  { const f = P, Hb = D + 1, Lmax = (D + 1) + W + D, ctrl = -W / 2 - Hb + 1.0 + 0.5;
    rect(f, -W / 2, W / 2, 0, Lmax, 2); rect(f, -W / 2 - Hb, -W / 2, D, D + W, 2);
    fil(f, -W / 2, D, -1, -1, 1, 2); fil(f, -W / 2, D + W, -1, 1, 1, 2);
    paint(f, c => { D_.dashU(c, -W / 2, W / 2, 0.1, 0.15, YEL, 0.25);
      D_.bar(c, ctrl - 0.5, D, ctrl - 0.5 + 0.1, D + W, WHT); D_.bar(c, ctrl - 0.1, D, ctrl, D + W, WHT); });
    const fe = { x: f.x, z: f.z, h: f.h + Math.PI };
    pts(f, [[0, Lmax - 1]]);
    M({ id: "box", name: "Tor joyda qayrilib olish (boksga orqa bilan kirish)", fe, f, Hb, Lmax, ctrl, boxV: [D, D + W], tick(d) {
      const st = this.st, rc = d.rearCorners().map(([x, z]) => W2L(f, x, z));
      if (!st.ok && rc.every(([u, v]) => u <= ctrl && v > D && v < D + W)) { st.ok = true; d.say("✅ Boksga kirdingiz. Endi chiqib, chorrahaga qayting"); }
      if (W2L(fe, d.car.x, d.car.z)[1] > 0.5) { if (!st.ok) return d.end(false, "Boksga kirish mashqi bajarilmadi"); this.done = true; }
    }, custom: true });
  }

  // 6. Chorrahaga qaytish va o'ngga burilish
  { const f = X, sq0 = La, sq1 = La + RW, fe = adv(f, -RW / 2 - Lw, sq0 + RW / 2, -Math.PI / 2);
    const rt = Rx + RW / 2, arc = [[0, sq1 + Rx + 2]];   // o'ngga burilish: bordyur radiusi 4,5 m bilan konsentrik
    for (let i = 0; i <= 10; i++) { const t = i / 10 * Math.PI / 2; arc.push([-rt + rt * Math.cos(t), sq1 + Rx - rt * Math.sin(t)]); }
    arc.push([-RW / 2 - Lw, sq0 + RW / 2]); pts(f, arc);
    M({ id: "cross2", name: "Harakat tartibga solingan chorraha (o'ngga burilish)", fe, tick(d) {
      const st = this.st, [cu, cv] = W2L(f, d.car.x, d.car.z);
      if (cv < sq0 - 2) return d.end(false, "Chorrahada o'ngga burilish kerak edi (marshrut)");
      if (d.ctl.sigR && cv > sq0) st.sig = true;                      // YHQ 45-band: burilishdan oldin ishora
      if (!st.chk && cu < -RW / 2 - 0.5) { st.chk = true; if (!st.sig) d.err("45-band: o'ngga burilishdan oldin o'ng burilish chirog'ini yoqmadingiz"); }
    } });
    P = fe;
  }
  // chapga burilish (janubga)
  { const f = P, R = 8; ann(f, -R, 0, R - RW / 2, R + RW / 2, 0, Math.PI / 2);
    const arc = []; for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; arc.push([-R + R * Math.cos(a), R * Math.sin(a)]); } pts(f, arc);
    P = adv(f, -R, R, -Math.PI / 2); M({ id: "bend", hide: true, name: "Yo'l", fe: P }); }
  road(8);

  // 7. Ilon izi ("B" toifa: tashqi radius 7,65 m, 135° yoylar, yo'lak 2÷2,5·V) — 16-band
  { const f = P, Rc = 7.65 - W / 2, k = Math.SQRT1_2, c2u = -Rc - 2 * Rc * k, c2v = 2 * Rc * k;
    ann(f, -Rc, 0, Rc - W / 2, Rc + W / 2, 0, 3 * Math.PI / 4, 3); ann(f, c2u, c2v, Rc - W / 2, Rc + W / 2, -Math.PI, -Math.PI / 4, 3);
    rect(f, -W / 2, W / 2, -0.5, 0.3, 3); rect(f, c2u - Rc - W / 2, c2u - Rc + W / 2, c2v - 0.3, c2v + 0.5, 3);
    paint(f, c => { D_.dashU(c, -W / 2, W / 2, 0.1, 0.15, YEL, 0.25); D_.dashU(c, c2u - Rc - W / 2, c2u - Rc + W / 2, c2v - 0.1, 0.15, YEL, 0.25); });
    sign(f, RW / 2 + 0.8, -3, ["1.12.2"]);
    // tavsiya etilgan chiziq (orqa o'q): ichki bordyur va old burchakning tashqi chizig'i orasida
    const rIn = Rc - W / 2 + V / 2, rOut = Math.sqrt(7.65 ** 2 - ((D + spec.wb) / 2) ** 2) - V / 2, r = Math.min(Rc, (rIn + rOut) / 2);
    const rr = t => r + (Rc - r) * Math.max(0, 1 - t / 0.25, (t - 0.75) / 0.25);   // uchlarida o'q chizig'iga qaytadi
    const arc = []; for (let i = 1; i <= 16; i++) { const t = i / 16, a = t * 3 * Math.PI / 4; arc.push([-Rc + rr(t) * Math.cos(a), rr(t) * Math.sin(a)]); }
    for (let i = 1; i <= 16; i++) { const t = i / 16, a = -Math.PI / 4 - t * 3 * Math.PI / 4; arc.push([c2u + rr(t) * Math.cos(a), c2v + rr(t) * Math.sin(a)]); }
    pts(f, arc, { spd: 3 });
    P = adv(f, c2u - Rc, c2v);
    exitAt(M({ id: "snake", name: "Ilon izi" }), P); }
  road(6);

  // 8. Orqaga harakatlanib parallel to'xtash ("B": cho'ntak uzunligi 1,8÷2,2·D, chuqurligi ≥ V+1) — 18-band
  { const f = P, Lp = 2.0 * D, Dp = V + 1, a = 3, Lt = a + Lp + D + 4, edge = RW / 2 + Dp, ctrlD = 0.4 * K;
    rect(f, -RW / 2, RW / 2, 0, Lt, 4); rect(f, RW / 2, edge, a, a + Lp, 4);
    paint(f, c => { D_.dashV(c, RW / 2, a, a + Lp, 0.15, YEL, 0.25); D_.bar(c, edge - ctrlD - 0.1, a, edge - ctrlD, a + Lp, WHT); });
    sign(f, edge + 0.7, a, ["5.15"]);
    pts(f, [[0, Lt]]);
    P = adv(f, 0, Lt);
    M({ id: "park", name: "Orqaga harakatlanib parallel to'xtash (parkovka)", fe: P, f, a, Lp, edge, ctrlD, tick(d) {
      const st = this.st, cs = d.corners().map(([x, z]) => W2L(f, x, z)), dh = angDiff(d.car.h, f.h);
      const inside = cs.every(([u, v]) => u > RW / 2 && u < edge && v > a && v < a + Lp);
      // YHQ 45-band: to'xtash joyiga kirishdan (to'xtashdan) oldin o'ng, chiqishdan (harakatni boshlashdan) oldin chap ishora
      if (d.ctl.sigR) st.sigIn = true;
      if (!st.chkIn && cs.some(([u, v]) => u > RW / 2 + 0.2 && v > a && v < a + Lp)) { st.chkIn = true; if (!st.sigIn) d.err("45-band: to'xtash joyiga kirishdan oldin o'ng burilish chirog'ini yoqmadingiz"); }
      if (st.ok && d.ctl.sigL) st.sigOut = true;
      if (st.ok && !st.chkOut && cs.every(([u]) => u < RW / 2)) { st.chkOut = true; if (!st.sigOut) d.err("45-band: to'xtash joyidan chiqishdan oldin chap burilish chirog'ini yoqmadingiz"); }
      if (!st.ok && inside && Math.abs(d.car.v) < 0.05 && Math.abs(dh) < 0.12) {
        const gap = edge - Math.max(...cs.map(c => c[0]));
        if (gap <= ctrlD) { st.ok = true; d.say("✅ Parkovka bajarildi. Endi yo'lga chiqib, davom eting"); }
        else if (!st.hint) { st.hint = true; d.say("Mashinani bordyurga yaqinroq (nazorat chizig'idan o'tib) qo'ying"); }
      }
      if (!st.ok && !st.miss && W2L(f, d.car.x, d.car.z)[1] > Lt - 1) { st.miss = true; d.err("Parkovka mashqi bajarilmadi"); }
    } });
  }
  road(4);

  // 9. Tartibga solinmagan temir yo'l kesishmasi — 20-band (1.12 chizig'i kesishmadan ≥ 2,0 m oldin; 1.2, 1.3.1, 2.5 belgilari)
  { const f = P, sl = 6, r1 = sl + 0.4 + 2.5, gauge = 1.52;
    rect(f, -RW / 2, RW / 2, 0, 16);
    paint(f, c => { D_.bar(c, -RW / 2, sl, RW / 2, sl + 0.4, WHT); D_.bar(c, -RW / 2 - 1, r1 - 0.8, RW / 2 + 1, r1 + gauge + 0.8, "#6d6a63"); });
    const g = grp(f), steel = mat(0x8d8d8d), wood = mat(0x5d4037);
    for (const rv of [r1, r1 + gauge]) box(g, RW + 8, 0.12, 0.08, 0, 0.06, -rv, steel);
    for (let u = -RW / 2 - 4; u <= RW / 2 + 4; u += 0.6) box(g, 0.25, 0.05, gauge + 1.0, u, 0.025, -(r1 + gauge / 2), wood);
    sign(f, RW / 2 + 0.8, 0.5, ["1.2"]); sign(f, RW / 2 + 0.8, sl + 0.4, ["1.3.1", "2.5"]);
    pts(f, [[0, sl - 0.3]], { stopFront: sl - 0.3, hold: 1.2 }); pts(f, [[0, 16]]); P = adv(f, 0, 16);
    exitAt(M({ id: "rail", name: "Temir yo'l kesishmasi (tartibga solinmagan)", f, sl, tick(d) {
      const st = this.st, fv = W2L(f, ...d.front())[1];
      if (!st.ok && Math.abs(d.car.v) < 0.05 && fv <= sl && fv >= sl - 3) { st.ok = true; d.say("✅ To'xtadingiz. Poyezd yo'qligiga ishonch hosil qilib, o'ting"); }
      if (!st.ok && !st.miss && fv > sl + 0.05) { st.miss = true; d.err("2.5 \"STOP\" belgisi: to'xtash chizig'i oldida to'xtamadingiz"); }
    } }), P); }
  road(4);

  // 10. Tezlashish bo'lagi — 21-band (buyruqda "4.6", amaldagi YHQ 1-ilovasida "Eng kam tezlik" — 4.7: "20", 3.24 "40", oxirida 3.24 "20"; kamida 40 m)
  { const f = P, z0 = 2, z1 = 42;
    rect(f, -RW / 2, RW / 2, 0, 50);
    sign(f, RW / 2 + 0.8, z0, ["4.7-20", "3.24-40"]); sign(f, RW / 2 + 0.8, z1, ["3.24-20"]);
    pts(f, [[0, z0 + 1]], {}); pts(f, [[0, z1 - 14]], { spd: 8.5 }); pts(f, [[0, 50]], { spd: 5 });
    P = adv(f, 0, 50);
    exitAt(M({ id: "accel", name: "Tezlashish bo'lagi", fast(d) { const fv = W2L(f, ...d.front())[1]; return fv > z0 && fv < z1; }, tick(d) {
      const st = this.st, fv = W2L(f, ...d.front())[1], kmh = Math.abs(d.car.v) * KMH;
      if (fv > z0 && fv < z1) { st.max = Math.max(st.max || 0, kmh); if (kmh > 40.5 && !st.over) { st.over = true; d.err("3.24: tezlik 40 km/soatdan oshdi"); } }
      if (fv >= z1 && !st.end) { st.end = true;
        if ((st.max || 0) < 20) d.err("4.7: eng kam tezlikka (20 km/soat) erishmadingiz");
        else if (kmh > 20.5) d.err("3.24: belgigacha 20 km/soatgacha sekinlashmadingiz"); else d.say("✅ Tezlashish bo'lagi bajarildi"); }
    } }), P); }
  road(6);

  // 11. Avariya holatda to'xtash — 22-band (sxemada o'lcham berilmagan; signal va 1 soniya reaksiya — o'yin sharti)
  { const f = P, g = grp(f);
    rect(f, -RW / 2, RW / 2, 0, 34);
    box(g, 0.1, 2.6, 0.1, RW / 2 + 1, 1.3, -16, poleMat);
    const lampM = new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0xff1a1a, emissiveIntensity: 0.05 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), lampM); lamp.position.set(RW / 2 + 1, 2.9, -16); g.add(lamp);
    pts(f, [[0, 34]], { spd: 5, emerg: true }); P = adv(f, 0, 34);
    exitAt(M({ id: "emerg", name: "Avariya holatda to'xtash", tick(d, dt) {
      const st = this.st, fv = W2L(f, ...d.front())[1], kmh = Math.abs(d.car.v) * KMH;
      if (!st.trig && fv > 6 && (kmh >= 15 || fv > 24)) { st.trig = true; st.t0 = d.t; lampM.emissiveIntensity = 3; d.say("🛑 XAVF! Zudlik bilan to'xtang!");
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
        if (kmh < 15) { st.slow = true; d.err("Avariya mashqi uchun tezlik kamida 15 km/soat bo'lishi kerak"); } }
      if (st.trig && !st.react && d.brakeV > 0.3) st.react = true;
      if (st.trig && !st.react && !st.late && d.t - st.t0 > 1.0) { st.late = true; d.err("Avariya signalida kech tormoz berdingiz (1 soniyadan ko'p)"); }
      if (st.trig && !st.ok && Math.abs(d.car.v) < 0.05) { st.ok = true; lampM.emissiveIntensity = 0.05; d.say("✅ To'xtadingiz. Finishga boring"); }
      d.signal = st.trig && !st.ok;
    } }), P); }
  road(4);

  // 12. Harakatni yakunlash (FINISH) — 23-band (finish maydoni kamida 10 m, keyin to'xtab turish joyi)
  { const f = P, fl = 2, fz = fl + 0.4 + 10;
    rect(f, -RW / 2, RW / 2, 0, fz + 5); rect(f, RW / 2, RW / 2 + 3, fz + 0.5, fz + 5);
    paint(f, c => { D_.bar(c, -RW / 2, fl, RW / 2, fl + 0.4, WHT); D_.dashU(c, -RW / 2, RW / 2, fz, 0.15, YEL); D_.text(c, "FINISH", -RW / 2 - 1.9, fl + 1.2, 0.8, WHT, -Math.PI / 2);
      D_.text(c, "P", RW / 2 + 1.5, fz + 2.7, 1.6, WHT); });
    pts(f, [[0, fl + 0.4 + D / 2 + 3]], { stopCenter: fl + 0.4 + D / 2 + 3 });
    M({ id: "finish", name: "Harakatni yakunlash (FINISH)", f, fl, custom: true, tick(d) {
      const st = this.st, rv = Math.min(...d.rearCorners().map(([x, z]) => W2L(f, x, z)[1])), fv = W2L(f, ...d.front())[1];
      if (rv > fl + 0.4 && Math.abs(d.car.v) < 0.05) return d.end(true);
      if (fv > fz && !st.over) { st.over = true; d.err("Finish maydonida (10 m) to'xtamadingiz"); }
    } });
  }

  // ---------- yer teksturasi va harakatlanish mumkin bo'lgan maydon (maska) ----------
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  const ext = (f, u, v) => { const [x, z] = L2W(f, u, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); };
  for (const s of shapes) {
    if (s.t === "r") { ext(s.f, s.u0, s.v0); ext(s.f, s.u1, s.v0); ext(s.f, s.u0, s.v1); ext(s.f, s.u1, s.v1); }
    else if (s.t === "a") for (const a of [-1, 1]) for (const b of [-1, 1]) ext(s.f, s.cu + a * s.r1, s.cv + b * s.r1);
    else { ext(s.f, s.cu, s.cv); ext(s.f, s.cu + s.du * s.r, s.cv + s.dv * s.r); }
  }
  const X0 = Math.floor(x0 - 14), Z0 = Math.floor(z0 - 14), cw = Math.ceil((x1 + 14 - X0) * PX), ch = Math.ceil((z1 + 14 - Z0) * PX);
  const setT = (c, f) => { const co = Math.cos(f.h), si = Math.sin(f.h); c.setTransform(PX * co, PX * si, PX * si, -PX * co, PX * (f.x - X0), PX * (f.z - Z0)); };
  const mk = document.createElement("canvas"); mk.width = cw; mk.height = ch; const mc = mk.getContext("2d");
  mc.fillStyle = "#000"; mc.fillRect(0, 0, cw, ch);
  for (const s of shapes) {
    setT(mc, s.f); mc.fillStyle = `rgb(255,${s.z * 40},0)`;
    if (s.t === "r") mc.fillRect(s.u0, s.v0, s.u1 - s.u0, s.v1 - s.v0);
    else if (s.t === "a") { mc.beginPath(); mc.arc(s.cu, s.cv, s.r1, s.a0, s.a1, false); mc.arc(s.cu, s.cv, s.r0, s.a1, s.a0, true); mc.closePath(); mc.fill(); }
    else { const ux = Math.min(s.cu, s.cu + s.du * s.r), vy = Math.min(s.cv, s.cv + s.dv * s.r);
      mc.save(); mc.beginPath(); mc.rect(ux, vy, s.r, s.r); mc.clip(); mc.beginPath(); mc.rect(ux, vy, s.r, s.r); mc.arc(s.cu + s.du * s.r, s.cv + s.dv * s.r, s.r, 0, 7); mc.fill("evenodd"); mc.restore(); }
  }
  mc.setTransform(1, 0, 0, 1, 0, 0);
  const md = mc.getImageData(0, 0, cw, ch).data, N = cw * ch, road01 = new Uint8Array(N), zone = new Uint8Array(N);
  for (let i = 0; i < N; i++) { road01[i] = md[i * 4] > 128 ? 1 : 0; zone[i] = md[i * 4 + 1] > 20 ? 1 : 0; }
  // chegaragacha masofa (piksel, chamfer)
  const dist = (inside) => { const d = new Float32Array(N).fill(99);
    for (let i = 0; i < N; i++) if (road01[i] !== inside) d[i] = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = y * cw + x; if (!d[i]) continue;
      let m = d[i]; if (x) m = Math.min(m, d[i - 1] + 1); if (y) { m = Math.min(m, d[i - cw] + 1); if (x) m = Math.min(m, d[i - cw - 1] + 1.41); if (x < cw - 1) m = Math.min(m, d[i - cw + 1] + 1.41); } d[i] = m; }
    for (let y = ch - 1; y >= 0; y--) for (let x = cw - 1; x >= 0; x--) { const i = y * cw + x; if (!d[i]) continue;
      let m = d[i]; if (x < cw - 1) m = Math.min(m, d[i + 1] + 1); if (y < ch - 1) { m = Math.min(m, d[i + cw] + 1); if (x < cw - 1) m = Math.min(m, d[i + cw + 1] + 1.41); if (x) m = Math.min(m, d[i + cw - 1] + 1.41); } d[i] = m; }
    return d; };
  const dIn = dist(1), dOut = dist(0);
  const tex = document.createElement("canvas"); tex.width = cw; tex.height = ch; const tc = tex.getContext("2d");
  const img = tc.createImageData(cw, ch), px = img.data;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    let r, g, b; const n = (rnd() - 0.5) * 10;
    if (road01[i]) {
      if (dIn[i] <= 1.5) [r, g, b] = zone[i] ? [242, 194, 0] : [245, 245, 245];      // 1.4 (sariq) yoki 1.1 (oq) chiziq
      else [r, g, b] = [86 + n, 90 + n, 96 + n];
    } else if (dOut[i] <= 1.5) [r, g, b] = [96 + n, 100 + n, 104 + n];                // chiziqdan bordyurgacha 0,1 m
    else if (dOut[i] <= 4.5) { const x = i % cw, y = (i / cw) | 0, s = ((x + y) / 10 | 0) % 2; [r, g, b] = s ? [235, 235, 235] : [40, 40, 40]; }  // bordyur
    else [r, g, b] = [100 + n, 160 + n, 80 + n];
    px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; px[i * 4 + 3] = 255;
  }
  tc.putImageData(img, 0, 0);
  for (const p of paints) { setT(tc, p.f); p.fn(tc); }
  tc.setTransform(1, 0, 0, 1, 0, 0);
  const texture = new THREE.CanvasTexture(tex); texture.anisotropy = 8; texture.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(cw / PX, ch / PX), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(X0 + cw / PX / 2, 0.005, Z0 + ch / PX / 2); root.add(ground);
  const drivable = (x, z) => { const i = Math.floor((x - X0) * PX), j = Math.floor((z - Z0) * PX); return i >= 0 && j >= 0 && i < cw && j < ch && road01[j * cw + i] === 1; };
  const nearRoad = (x, z, r) => { for (let a = -r; a <= r; a += 2) for (let b = -r; b <= r; b += 2) if (drivable(x + a, z + b)) return true; return false; };
  // daraxtlar
  const trunk = mat(0x6d4c41), leaf = mat(0x2e7d32);
  for (let i = 0, n = 0; i < 400 && n < 70; i++) {
    const x = X0 + rnd() * cw / PX, z = Z0 + rnd() * ch / PX; if (nearRoad(x, z, 5) || (x > 3 && x < 30 && z > -26 && z < 10)) continue; n++;
    const t = new THREE.Group(); box(t, 0.3, 1.6, 0.3, 0, 0.8, 0, trunk);
    const lf = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.4, 8), leaf); lf.position.y = 3; t.add(lf); t.position.set(x, 0, z); root.add(t);
  }
  // 3D bordyurlar: chiziqdan 0,15–0,45 m nariroqda, oq-qora bo'laklar
  { const pts3 = [];
    for (let y = 2; y < ch; y += 4) for (let x = 2; x < cw; x += 4) { const i = y * cw + x; if (!road01[i] && dOut[i] > 1.5 && dOut[i] <= 4.5) pts3.push([x, y]); }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), new THREE.MeshStandardMaterial({ roughness: 0.7 }), pts3.length);
    const mtx = new THREE.Matrix4(), col = new THREE.Color();
    pts3.forEach(([x, y], n) => { mtx.makeTranslation(X0 + x / PX, 0.07, Z0 + y / PX); im.setMatrixAt(n, mtx);
      im.setColorAt(n, col.set(((x + y) / 10 | 0) % 2 ? 0xeeeeee : 0x2b2b2b)); });
    im.castShadow = im.receiveShadow = true; root.add(im); }
  // avtodrom panjarasi — balandligi 2,0 m (talablarning 9-bandi)
  { const fc = document.createElement("canvas"); fc.width = fc.height = 64; const g = fc.getContext("2d");
    g.strokeStyle = "#9aa4a8"; g.lineWidth = 3; for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping;
    const fx0 = X0 + 4, fx1 = X0 + cw / PX - 4, fz0 = Z0 + 4, fz1 = Z0 + ch / PX - 4, postM = mat(0x6f7a80);
    const side = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), t = ft.clone(); t.repeat.set(len / 1.2, 2 / 1.2); t.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 2), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
      const fm = m.material; fm.alphaMap = null; m.position.set((ax + bx) / 2, 1, (az + bz) / 2); m.rotation.y = -Math.atan2(bz - az, bx - ax); root.add(m);
      for (let k = 0; k <= len; k += 3) box(root, 0.08, 2.1, 0.08, ax + (bx - ax) * k / len, 1.05, az + (bz - az) * k / len, postM); };
    ft.colorSpace = THREE.SRGBColorSpace;
    { const c2 = document.createElement("canvas"); c2.width = c2.height = 64; const g2 = c2.getContext("2d"); g2.drawImage(fc, 0, 0);
      // fon shaffof bo'lsin: faqat sim chiziqlari ko'rinadi
      const id = g2.getImageData(0, 0, 64, 64); for (let q = 0; q < id.data.length; q += 4) id.data[q + 3] = id.data[q] > 0 ? 255 : 0; g2.putImageData(id, 0, 0); ft.image = c2; }
    side(fx0, fz0, fx1, fz0); side(fx1, fz0, fx1, fz1); side(fx1, fz1, fx0, fz1); side(fx0, fz1, fx0, fz0); }
  // chiroq ustunlari (tungi yoritgichlar — 14-band)
  { const pm = mat(0x8a949a), lm = new THREE.MeshStandardMaterial({ color: 0xfffbe6, emissive: 0xfff3c4, emissiveIntensity: 0.6 });
    for (let i = 6; i < path.length; i += 9) { const a = path[i], b = path[Math.min(i + 1, path.length - 1)], dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
      const ox = a.x - dz / L * (RW / 2 + 1.6), oz = a.z + dx / L * (RW / 2 + 1.6);
      if (nearRoad(ox, oz, 1)) continue;
      box(root, 0.14, 6, 0.14, ox, 3, oz, pm); const arm = box(root, 0.08, 0.08, 1.4, ox, 5.95, oz, pm); arm.rotation.y = Math.atan2(-dz, dx) + Math.PI / 2;
      const lamp = box(root, 0.5, 0.12, 0.25, ox + dz / L * 1.2, 5.88, oz - dx / L * 1.2, lm); lamp.rotation.y = arm.rotation.y; } }
  // soyalar
  root.traverse(o => { if (o.isMesh && o !== ground) { o.castShadow = true; o.receiveShadow = true; } });
  ground.receiveShadow = true;
  const height = (x, z) => { for (const r of ramps) { const [u, v] = W2L(r.f, x, z); if (Math.abs(u) <= r.hw && v > r.v0 && v < r.v3) return r.hAt(v); } return 0; };
  return { root, mods, lights, path, drivable, height, W, RW, start: { x: 0, z: D / 2 + 0.6, h: 0 }, bounds: { X0, Z0, w: cw / PX, h: ch / PX } };
}

function buildWorld(scene) {
  // osmon (fizik modeldagi quyosh nuri tarqalishi)
  const sky = new Sky(); sky.scale.setScalar(900); scene.add(sky);
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(55), THREE.MathUtils.degToRad(200));
  Object.assign(sky.material.uniforms, {}); sky.material.uniforms.sunPosition.value.copy(sunDir);
  sky.material.uniforms.turbidity.value = 6; sky.material.uniforms.rayleigh.value = 1.6;
  sky.material.uniforms.mieCoefficient.value = 0.004; sky.material.uniforms.mieDirectionalG.value = 0.8;
  scene.fog = new THREE.Fog(0xc9dcea, 90, 260);
  scene.add(new THREE.HemisphereLight(0xdfefff, 0x55703a, 0.75));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 120 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.userData.dir = sunDir; scene.add(sun, sun.target);
  // o't (shovqinli tekstura)
  const gc = document.createElement("canvas"); gc.width = gc.height = 256; const g = gc.getContext("2d");
  g.fillStyle = "#5f9a45"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? "rgba(40,90,30,0.35)" : v < 0.85 ? "rgba(120,170,80,0.3)" : "rgba(150,140,80,0.25)"; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  const gt = new THREE.CanvasTexture(gc); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(220, 220); gt.colorSpace = THREE.SRGBColorSpace; gt.anisotropy = 8;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshStandardMaterial({ map: gt, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; grass.receiveShadow = true; scene.add(grass);
  // o'quv binosi va bayroq (yo'llardan sharqda)
  const bld = new THREE.Group(); bld.position.set(22, 0, -12); scene.add(bld);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 20), new THREE.MeshStandardMaterial({ color: 0xf1ede4 })); wall.position.y = 3.5; bld.add(wall);
  const roofB = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 20.6), new THREE.MeshStandardMaterial({ color: 0x2e6fbd })); roofB.position.y = 7.2; bld.add(roofB);
  const glass = new THREE.MeshStandardMaterial({ color: 0x5d88a8, roughness: 0.15, metalness: 0.4 });
  for (let fl = 0; fl < 2; fl++) for (let k = 0; k < 6; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 2), glass); w.position.set(-4.52, 1.8 + fl * 3, -7.5 + k * 3); bld.add(w); }
  bld.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 9), new THREE.MeshStandardMaterial({ color: 0xcfd8dc })); pole.position.set(12, 4.5, 4); pole.castShadow = true; scene.add(pole);
  [0x1eb4e6, 0xffffff, 0x1eb53a].forEach((c, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.02), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }));
    f.position.set(12.95, 8.6 - i * 0.42, 4); scene.add(f); });
  // yo'l harakati xodimi — start oldida, yo'ldan tashqarida (bezak)
  loadModel("police").then(src => {
    const o = src.clone(true), piv = new THREE.Group(); piv.add(o);
    const box = new THREE.Box3().setFromObject(piv), k = 1.8 / box.getSize(new THREE.Vector3()).y;
    piv.scale.setScalar(k); piv.updateMatrixWorld(true);
    const b2 = new THREE.Box3().setFromObject(piv), c = b2.getCenter(new THREE.Vector3());
    piv.position.set(7 - c.x, -b2.min.y, 1 - c.z); piv.traverse(m => { if (m.isMesh) m.castShadow = true; }); scene.add(piv);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    stand.position.set(7, 0.06, 1); scene.add(stand);
  }).catch(() => {});
  return { sun };
}

// ---------- OVOZ (WebAudio: dvigatel, povorotnik, signal, zarba) ----------
const Sound = {
  ctx: null, on: true,
  init() {
    try { const s = localStorage.getItem("snd"); if (s !== null) this.on = s === "1"; } catch (e) {}
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const x = this.ctx = new AC();
    this.master = x.createGain(); this.master.gain.value = this.on ? 0.6 : 0; this.master.connect(x.destination);
    this.lp = x.createBiquadFilter(); this.lp.type = "lowpass"; this.lp.frequency.value = 600; this.lp.Q.value = 2;
    this.eng = x.createGain(); this.eng.gain.value = 0; this.lp.connect(this.eng).connect(this.master);
    this.o1 = x.createOscillator(); this.o1.type = "sawtooth"; this.o2 = x.createOscillator(); this.o2.type = "triangle";
    const g2 = x.createGain(); g2.gain.value = 0.6; this.o1.connect(this.lp); this.o2.connect(g2).connect(this.lp);
    this.o1.frequency.value = 27; this.o2.frequency.value = 13.5; this.o1.start(); this.o2.start();
    const n = x.createBuffer(1, x.sampleRate * 0.03, x.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    this.noise = n;
  },
  toggle() { this.on = !this.on; try { localStorage.setItem("snd", this.on ? "1" : "0"); } catch (e) {} if (this.master) this.master.gain.value = this.on ? 0.6 : 0; return this.on; },
  engine(rpm, load) {
    if (!this.ctx) return; const t = this.ctx.currentTime, f = rpm / 60 * 2;   // 4 silindr: aylanishiga 2 ta yonish
    this.o1.frequency.setTargetAtTime(f, t, 0.06); this.o2.frequency.setTargetAtTime(f / 2, t, 0.06);
    this.lp.frequency.setTargetAtTime(300 + load * 700 + rpm / 5, t, 0.08); this.eng.gain.setTargetAtTime(0.05 + load * 0.06, t, 0.1);
  },
  click(hi) {
    if (!this.ctx) return; const x = this.ctx, s = x.createBufferSource(), bp = x.createBiquadFilter(), g = x.createGain();
    s.buffer = this.noise; bp.type = "bandpass"; bp.frequency.value = hi ? 2600 : 1700; bp.Q.value = 4; g.gain.value = 0.9;
    s.connect(bp).connect(g).connect(this.master); s.start();
  },
  thump() {
    if (!this.ctx) return; const x = this.ctx, o = x.createOscillator(), g = x.createGain(), t = x.currentTime;
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.connect(g).connect(this.master); o.start(); o.stop(t + 0.3);
  },
  horn(on) {
    if (!this.ctx) return; const x = this.ctx;
    if (on && !this.hornG) { this.hornG = x.createGain(); this.hornG.gain.value = 0.12; this.hornG.connect(this.master);
      this.hornO = [415, 520].map(fq => { const o = x.createOscillator(); o.type = "square"; o.frequency.value = fq; o.connect(this.hornG); o.start(); return o; }); }
    else if (!on && this.hornG) { this.hornO.forEach(o => o.stop()); this.hornG.disconnect(); this.hornG = null; }
  },
  silence() { if (this.ctx) { this.eng.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); this.horn(false); } },
};

// ---------- O'YIN ----------
const ui = id => document.getElementById(id);
const haptic = (kind, v) => { const h = window.Telegram?.WebApp?.HapticFeedback; if (!h) return; kind === "impact" ? h.impactOccurred(v) : kind === "sel" ? h.selectionChanged() : h.notificationOccurred(v); };
const WHEEL_MAX = 540;      // rul g'ildiragi: chapga/o'ngga 1,5 aylanish (≈ 14:1 uzatish)
const Drive = {
  keys: {}, run: false, camMode: 0, carId: "cobalt",
  ctl: { wheel: 0, touch: false, gas: 0, brake: 0, gear: "P", sigL: false, sigR: false, horn: false },
  init() {
    if (this.renderer) return;
    const cv = ui("cv");
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.85;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 1200);
    this.world = buildWorld(this.scene);
    // ko'zgular: alohida kameralar → kichik teksturalar → ekran ustidagi qatlam (ko'zgu sifatida teskari)
    this.mirrors = [["rear", 512, 160, 40], ["left", 256, 160, 36], ["right", 256, 160, 36]].map(([id, w, h, fov]) => {
      const rt = new THREE.WebGLRenderTarget(w, h, { samples: 2 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
      const tex = rt.texture; tex.repeat.x = -1; tex.offset.x = 1; tex.wrapS = THREE.RepeatWrapping;
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      return { id, rt, cam: new THREE.PerspectiveCamera(fov, w / h, 0.1, 300), frame, glass };
    });
    this.hud = new THREE.Scene(); this.hudCam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
    this.mirrors.forEach(m => this.hud.add(m.frame, m.glass));
    addEventListener("resize", () => this.resize());
  },
  start(carId) {
    if (carId) this.carId = carId;
    this.init(); Sound.init();
    ui("game").style.display = "block"; this.resize();
    const spec = CARS[this.carId];
    if (this.course) { this.scene.remove(this.course.root); this.course.root.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose?.(); }); }
    this.course = makeCourse(spec); this.scene.add(this.course.root);
    if (this.carObj) this.scene.remove(this.carObj);
    this.carObj = carMesh(spec); this.scene.add(this.carObj); this.spec = spec;
    this.carObj.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // kabinadan ko'rinadigan kapot
    if (this.hood) this.scene.remove(this.hood);
    this.hood = null;
    if (spec.type !== "van") {
      // kapot: oldinga torayib, pastga egilgan sirt (haydovchi o'rnidan ko'rinadigan qismi)
      const hl = spec.len / 2 - 0.6, w0 = spec.wid - 0.2, w1 = spec.wid - 0.5, g = new THREE.BufferGeometry();
      const v = [-w0 / 2, 0, -0.6, w0 / 2, 0, -0.6, w1 / 2, -0.1, -0.6 - hl, -w1 / 2, -0.1, -0.6 - hl];
      g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
      this.hood = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.3, metalness: 0.55, side: THREE.DoubleSide }));
      this.scene.add(this.hood);
    }
    const s0 = this.course.start;
    this.car = { x: s0.x, z: s0.z, h: s0.h, v: 0, steer: 0, y: 0 };
    Object.assign(this.ctl, { wheel: 0, touch: false, gas: 0, brake: 0, gear: "P", sigL: false, sigR: false, horn: false, cancel: false });
    Object.assign(this, { t: 0, pen: 0, mi: 0, log: [], edge: false, edgeT: 0, speeding: false, signal: false, prevFv: null, result: null, keys: {}, blink: 0, frame: 0 });
    this.say(`1-mashq: ${this.course.mods[0].name}. Tormozni bosib, uzatmani D ga qo'ying, chap burilish chirog'ini yoqing. Tezlik — 20 km/soatgacha`, 7);
    this.syncUI();
    this.run = true; this.last = performance.now(); const gen = this.gen = (this.gen || 0) + 1;
    requestAnimationFrame(t => this.loop(t, gen));
  },
  resize() {
    if (!this.renderer) return;
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false); ui("cv").style.width = w + "px"; ui("cv").style.height = h + "px";
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    Object.assign(this.hudCam, { left: 0, right: w, top: h, bottom: 0 }); this.hudCam.updateProjectionMatrix();
    // ko'zgular joylashuvi (piksel): salon ko'zgusi tepada o'rtada, yon ko'zgular chetlarda
    const rw = Math.min(w * 0.3, 360), rh = rw / 3.2, sw = Math.min(w * 0.17, 200), sh = sw / 1.6;
    const place = (m, cx, cy, ww, hh) => { m.glass.position.set(cx, cy, 0); m.glass.scale.set(ww, hh, 1); m.frame.position.set(cx, cy, -0.1); m.frame.scale.set(ww + 8, hh + 8, 1); };
    place(this.mirrors[0], w / 2, h - 18 - rh / 2, rw, rh);
    place(this.mirrors[1], 6 + sw / 2, h * 0.665, sw, sh);
    place(this.mirrors[2], w - 6 - sw / 2, h * 0.665, sw, sh);
  },
  toggleCam() { this.camMode = (this.camMode + 1) % 3; this.syncUI(); },
  toggleSound() { const on = Sound.toggle(); ui("bSnd").textContent = on ? "🔊" : "🔇"; },
  setGear(g) {
    const c = this.ctl; if (!this.run || g === c.gear) return;
    if (Math.abs(this.car.v) > 0.3) return this.say("Uzatmani almashtirishdan oldin to'liq to'xtang");
    if (c.brake < 0.2 && !this.keys.brake) return this.say("Uzatmani almashtirish uchun tormoz pedalini bosib turing");
    c.gear = g; haptic("sel"); Sound.click(false); this.syncUI();
  },
  signal(side) {
    const c = this.ctl;
    if (side === "L") { c.sigL = !c.sigL; c.sigR = false; } else { c.sigR = !c.sigR; c.sigL = false; }
    c.cancel = false; Sound.click(true); haptic("sel"); this.syncUI();
  },
  horn(on) { this.ctl.horn = on; Sound.horn(on); },
  syncUI() {
    const c = this.ctl;
    document.querySelectorAll("#gearbox button").forEach(b => b.classList.toggle("on", b.dataset.g === c.gear));
    ui("bSigL")?.classList.toggle("on", c.sigL); ui("bSigR")?.classList.toggle("on", c.sigR);
    ui("game")?.classList.toggle("cabin", this.camMode === 0);
    if (ui("gearInd")) ui("gearInd").textContent = c.gear;
  },
  say(t, sec = 4) { const m = ui("hMsg"); m.textContent = t; m.style.display = "block"; this.msgT = sec; },
  err(why) {
    this.pen += 1; this.log.push(why); this.say(`⚠️ ${why}`, 5);
    haptic("note", "warning");
    if (this.pen >= MAX_ERR) this.end(false, `${MAX_ERR} ta xato: ${this.log.join("; ")}`);
  },
  loop(now, gen) {
    if (!this.run || gen !== this.gen) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    this.update(dt); if (!this.run) return; this.render(dt);
    requestAnimationFrame(t => this.loop(t, gen));
  },
  fwd() { return [Math.sin(this.car.h), -Math.cos(this.car.h)]; },
  front() { const [fx, fz] = this.fwd(), L = this.spec.len / 2; return [this.car.x + fx * L, this.car.z + fz * L]; },
  rear() { const [fx, fz] = this.fwd(), L = this.spec.len / 2; return [this.car.x - fx * L, this.car.z - fz * L]; },
  corners() {
    const c = this.car, [fx, fz] = this.fwd(), rx = -fz, rz = fx, L = this.spec.len / 2, W = this.spec.wid / 2;
    return [[L, W], [L, -W], [-L, W], [-L, -W]].map(([a, b]) => [c.x + fx * a + rx * b, c.z + fz * a + rz * b]);
  },
  rearCorners() { return this.corners().slice(2); },
  update(dt) {
    const c = this.car, k = this.keys, s = this.spec, C = this.course, ctl = this.ctl;
    this.t += dt;
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) ui("hMsg").style.display = "none";
    for (const L of C.lights) L.show(this.t);
    // --- boshqaruv: sensorli rul/pedallar yoki (sinov va klaviatura uchun) keys ---
    if (k.gas || k.reverse) ctl.gear = k.reverse ? "R" : "D";
    const gasV = Math.max(ctl.gas, k.gas || k.reverse ? 1 : 0), brakeV = Math.max(ctl.brake, k.brake ? 1 : 0);
    if (k.left || k.right) ctl.wheel += (k.right ? 1 : -1) * 900 * dt;
    else if (!ctl.touch) ctl.wheel -= Math.sign(ctl.wheel) * Math.min(Math.abs(ctl.wheel), Math.min(1, Math.abs(c.v) / 4) * 300 * dt);   // harakatda rul o'zi qaytadi
    ctl.wheel = Math.max(-WHEEL_MAX, Math.min(WHEEL_MAX, ctl.wheel));
    c.steer = ctl.wheel / WHEEL_MAX * STEER;
    // povorotnik: burilishdan keyin rul qaytganda o'zi o'chadi (46-band)
    if ((ctl.sigL || ctl.sigR) && Math.abs(ctl.wheel) > 200) ctl.cancel = true;
    if (ctl.cancel && Math.abs(ctl.wheel) < 40) { ctl.sigL = ctl.sigR = false; ctl.cancel = false; this.syncUI(); }
    // --- fizika: avtomat uzatma, tormoz, qiyalik ---
    const [fx, fz] = this.fwd();
    const hF = C.height(c.x + fx * s.wb / 2, c.z + fz * s.wb / 2), hR = C.height(c.x - fx * s.wb / 2, c.z - fz * s.wb / 2);
    const slope = Math.atan2(hF - hR, s.wb);                 // >0 — tepaga qarab turibdi
    const dir = ctl.gear === "D" ? 1 : ctl.gear === "R" ? -1 : 0;
    let a = 0;
    if (dir) {
      const vd = c.v * dir, vmax = dir > 0 ? 14 : 4;
      if (gasV > 0.02) a += dir * s.acc * gasV * Math.max(0, 1 - vd / vmax) * (vd < 0 ? 1.5 : 1);
      else if (brakeV < 0.05) a += vd < (dir > 0 ? 1.4 : 1.1) ? dir * 0.9 : -dir * 0.5;   // "sudralish" va dvigatel bilan tormozlash
    }
    c.v += a * dt;
    if (brakeV > 0) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 8 * brakeV * dt);
    c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 0.25 * dt);                       // dumalash qarshiligi
    const hold = ctl.gear === "P" || (brakeV > 0.3 && gasV < 0.05 && Math.abs(c.v) < 0.15);
    if (hold) c.v = 0; else c.v -= 9.8 * Math.sin(slope) * dt * 0.75;                  // qiyalikda orqaga ketish
    // velosiped modeli: orqa o'q yon tomonga sirpanmaydi, mashina orqa o'q atrofida buriladi
    const rx = c.x - fx * s.wb / 2 + fx * c.v * dt, rz = c.z - fz * s.wb / 2 + fz * c.v * dt;
    c.h += (c.v / s.wb) * Math.tan(c.steer) * dt;
    c.x = rx + Math.sin(c.h) * s.wb / 2; c.z = rz - Math.cos(c.h) * s.wb / 2;
    c.y = (hF + hR) / 2; c.pitch = slope;
    this.gasV = gasV; this.brakeV = brakeV;
    // ovoz: dvigatel aylanishlari (avtomat qutining 3 pog'onasi)
    const av = Math.abs(c.v), steps = [0, 4.5, 9, 14], gi = Math.min(2, steps.findIndex((x, i) => av < steps[i + 1]) < 0 ? 2 : steps.findIndex((x, i) => av < steps[i + 1]));
    const rpm = dir ? 800 + (av - steps[gi]) / (steps[gi + 1] - steps[gi]) * 2400 + gasV * 600 : 800 + gasV * 3200;
    Sound.engine(rpm, gasV);
    this.blink += dt; const on = (this.blink % 0.8) < 0.4;
    if ((ctl.sigL || ctl.sigR) && on !== this.blinkOn) Sound.click(on); this.blinkOn = on;
    // yo'ldan chiqish va chegara chizig'ini bosish
    if (!C.drivable(c.x, c.z)) return this.end(false, "Mashina avtodrom yo'lidan chiqib ketdi");
    if (this.corners().some(([x, z]) => !C.drivable(x, z))) {
      if (!this.edge) { this.edge = true; Sound.thump(); haptic("impact", "heavy"); this.err("Chegara chizig'ini bosdingiz (bordyurga tegdingiz)"); if (!this.run) return; }
      this.edgeT = 0;
    } else if (this.edge && (this.edgeT += dt) > 0.7) this.edge = false;
    // svetofor: qizil ishorada to'xtash chizig'idan o'tish
    const [fxp, fzp] = this.front();
    for (const L of C.lights) {
      const fv = W2L(L.f, fxp, fzp)[1], pv = this.prevFv?.get(L) ?? fv; (this.prevFv ||= new Map()).set(L, fv);
      const p = L.phase(this.t);
      if (p === "red" && ((pv < L.stopS && fv >= L.stopS) || (pv > L.stopN && fv <= L.stopN))) this.err("Svetoforning qizil ishorasida to'xtash chizig'idan o'tdingiz");
      if (!this.run) return;
    }
    // mashqlar
    const m = C.mods[this.mi], kmh = Math.abs(c.v) * KMH;
    if (kmh < 18) this.speeding = false;
    else if (kmh > 20.5 && !(m.fast && m.fast(this)) && !this.speeding) { this.speeding = true; this.err("Avtodromda tezlik 20 km/soatdan oshmasligi kerak (3.24 belgisi)"); if (!this.run) return; }
    m.tick?.(this, dt); if (!this.run) return;
    if (!m.custom && m.fe && W2L(m.fe, c.x, c.z)[1] > 0) m.done = true;
    if (m.done && this.mi < C.mods.length - 1) {
      this.mi++; const n = C.mods[this.mi];
      if (n.msg) this.say(n.msg);
      else if (!n.hide) this.say(`${C.mods.filter((x, i) => i <= this.mi && !x.hide).length}-mashq: ${n.name}`);
    }
    if (this.t > TIME_LIMIT) return this.end(false, `Vaqt tugadi (${TIME_LIMIT / 60} daqiqa)`);
    const shown = C.mods.filter(x => !x.hide), idx = C.mods.slice(0, this.mi + 1).filter(x => !x.hide).length;
    ui("hTime").textContent = `⏱ ${this.t.toFixed(0)} s`;
    ui("hStep").textContent = `${Math.max(1, idx)}/${shown.length}`;
    ui("hPen").textContent = `Xato: ${this.pen}/${MAX_ERR}`;
    // asboblar paneli
    const nd = ui("needle"); if (nd) nd.setAttribute("transform", `rotate(${-120 + Math.min(100, kmh) * 2.4} 60 60)`);
    if (ui("spd")) ui("spd").textContent = Math.round(kmh);
    ui("tlL")?.classList.toggle("on", ctl.sigL && on); ui("tlR")?.classList.toggle("on", ctl.sigR && on);
    ui("tlB")?.classList.toggle("on", brakeV > 0.1 || ctl.gear === "P");
    const wh = ui("wheel"); if (wh) wh.style.transform = `rotate(${ctl.wheel}deg)`;
  },
  render(dt) {
    const c = this.car, o = this.carObj, s = this.spec, r = this.renderer;
    o.position.set(c.x, c.y, c.z); o.rotation.set(0, 0, 0); o.rotateY(-c.h); o.rotateX(c.pitch || 0);
    o.wheels.forEach(w => { if (w.front) w.rotation.y = -c.steer; w.children.forEach(m => m.rotation.x -= c.v * dt / 0.31); });
    o.brake.emissiveIntensity = (this.brakeV || 0) > 0.1 ? 1.4 : 0.05;
    if (this.hood) { this.hood.position.set(c.x, c.y + 0.86, c.z); this.hood.rotation.set(0, 0, 0); this.hood.rotateY(-c.h); this.hood.rotateX(c.pitch || 0); }
    const [fx, fz] = this.fwd(), rx = -fz, rz = fx, cam = this.camera, P = (f, rr, up) => new THREE.Vector3(c.x + fx * f + rx * rr, c.y + up, c.z + fz * f + rz * rr);
    const eyeH = s.type === "van" ? 1.42 : s.type === "hatch" ? 1.2 : 1.14;
    let tp, look;
    if (this.camMode === 0) { tp = P(-0.25, -0.36, eyeH); look = P(12, -0.36, eyeH - 1.1); cam.fov = 72; }          // haydovchi o'rni (chap tomonda)
    else if (this.camMode === 1) { tp = P(-7, 0, 3.2); look = P(4, 0, 0.8); cam.fov = 60; }
    else { tp = new THREE.Vector3(c.x, c.y + 22, c.z + 0.01); look = new THREE.Vector3(c.x, 0, c.z); cam.fov = 60; }
    cam.updateProjectionMatrix();
    if (this.camMode === 0 || this.camMode === 2) cam.position.copy(tp); else cam.position.lerp(tp, Math.min(1, dt * 5));
    cam.lookAt(look);
    // quyosh soyasi mashina atrofida
    const sun = this.world.sun; sun.target.position.set(c.x, 0, c.z); sun.position.copy(sun.target.position).addScaledVector(sun.userData.dir, 60);
    const cabin = this.camMode === 0;
    o.visible = !cabin; if (this.hood) this.hood.visible = cabin;
    r.autoClear = true; r.render(this.scene, cam);
    if (!cabin) return;
    // ko'zgular (har ikkinchi kadrda yangilanadi)
    if ((this.frame = (this.frame + 1) % 2) === 0) {
      const sideY = eyeH - 0.15, conf = {
        rear: [P(0.1, 0, eyeH + 0.1), P(-30, 0, eyeH - 0.6), false],
        left: [P(0.55, -(s.wid / 2 + 0.1), sideY), P(-30, -(s.wid / 2 + 5), sideY - 0.9), true],
        right: [P(0.55, s.wid / 2 + 0.1, sideY), P(-30, s.wid / 2 + 5, sideY - 0.9), true] };
      for (const m of this.mirrors) { const [pos, lk, showCar] = conf[m.id]; m.cam.position.copy(pos); m.cam.lookAt(lk);
        o.visible = showCar; if (this.hood) this.hood.visible = false;
        r.setRenderTarget(m.rt); r.render(this.scene, m.cam); }
      r.setRenderTarget(null); o.visible = false; if (this.hood) this.hood.visible = true;
    }
    r.autoClear = false; r.clearDepth(); r.render(this.hud, this.hudCam); r.autoClear = true;
  },
  async end(passed, reason) {
    if (!this.run) return; this.run = false; Sound.silence();
    const time = Math.round(this.t); this.result = { passed, reason, time, pen: this.pen, log: [...this.log] };
    if (passed && window.api) { try { window.setMe(await window.api("/api/result", { kind: "drive", passed: true, time })); } catch (e) {} }
    ui("game").style.display = "none";
    window.showDriveResult?.(passed, reason, time, this.pen, MAX_ERR);
  },
  stop() { this.run = false; Sound.silence(); ui("game").style.display = "none"; window.home(); },
};
window.Drive = Drive;
window.CARS = CARS;
