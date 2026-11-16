// 3D vaziyatli savollar: "Kim birinchi o'tadi?" — noto'g'ri javobda transport vositalari haqiqatdagidek to'qnashadi,
// keyin to'g'ri tartib yashil yo'nalish chiziqlari bilan ko'rsatiladi. Har bir vaziyat YHQ bandi bilan tekshirilgan.
import * as THREE from "three";

// ---------- VAZIYATLAR ----------
const SC = [
  { id: "teng", title: "Teng ahamiyatli chorraha", road: "cross", q: "Teng ahamiyatli chorraha. Qaysi avtomobil birinchi o'tadi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "N" }, B: { kind: "car", color: "kok", from: "E", to: "W" } },
    options: [{ t: "Oq avtomobil", order: ["A", "B"] }, { t: "Ko'k avtomobil", order: ["B", "A"] }], correct: 1,
    e: "Teng ahamiyatli yo'llar chorrahasida o'ng tomondan yaqinlashayotgan transport vositasiga yo'l beriladi. Ko'k avtomobil oq avtomobilning o'ng tomonida — u birinchi o'tadi, oq kutadi.",
    band: "105-band", iq: "Teng ahamiyatga ega boʻlgan yoʻllar kesishgan chorrahada relssiz transport vositasining haydovchisi oʻngdan yaqinlashayotgan transport vositalariga yoʻl berishi shart." },
  { id: "asosiy", title: "Asosiy yo'l", road: "main", q: "Oq avtomobil oldida 2.4 «Yo'l bering!» belgisi. Kim birinchi o'tadi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "N" }, B: { kind: "car", color: "kok", from: "W", to: "E" } },
    options: [{ t: "Oq avtomobil (ko'k chap tomonida)", order: ["A", "B"] }, { t: "Ko'k avtomobil", order: ["B", "A"] }], correct: 1,
    e: "Oq avtomobil ikkinchi darajali yo'lda. Asosiy yo'ldagi ko'k avtomobil chap tomondan kelayotgan bo'lsa ham birinchi o'tadi — bu yerda «o'ng qo'l» qoidasi qo'llanilmaydi.",
    band: "104-band", iq: "Teng ahamiyatga ega boʻlmagan yoʻllar kesishgan chorrahada ikkinchi darajali yoʻldan harakatlanayotgan transport vositasining haydovchisi asosiy yoʻldan yaqinlashayotgan transport vositalariga ularning keyingi harakatlanish yoʻnalishidan qatʼiy nazar, yoʻl berishi kerak." },
  { id: "chapga", title: "Chapga burilish", road: "cross", q: "Oq avtomobil chapga buriladi, qizil qarshidan to'g'riga ketadi. Kim birinchi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "W", sig: "L" }, B: { kind: "car", color: "qizil", from: "N", to: "S" } },
    options: [{ t: "Oq avtomobil", order: ["A", "B"] }, { t: "Qizil avtomobil", order: ["B", "A"] }], correct: 1,
    e: "Chapga burilayotgan haydovchi qarama-qarshi yo'nalishdan to'g'riga yoki o'ngga ketayotgan transportga yo'l beradi. Qizil birinchi o'tadi.",
    band: "107-band", iq: "Chapga burilishda yoki qayrilib olishda relssiz transport vositasining haydovchisi teng ahamiyatli yoʻldan qarama-qarshi yoʻnalishdan toʻgʻriga yoki oʻngga harakatlanayotgan transport vositalariga yoʻl berishi shart." },
  { id: "uchta", title: "Uch avtomobil", road: "cross", q: "Teng ahamiyatli chorraha. Avtomobillar qaysi tartibda o'tadi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "N" }, B: { kind: "car", color: "kok", from: "E", to: "W" }, C: { kind: "car", color: "sariq", from: "N", to: "S" } },
    options: [{ t: "Oq → Ko'k → Sariq", order: ["A", "B", "C"] }, { t: "Sariq → Ko'k → Oq", order: ["C", "B", "A"] }, { t: "Ko'k → Oq → Sariq", order: ["B", "A", "C"] }], correct: 1,
    e: "Har biri o'ngdagiga yo'l beradi: sariqning o'ngida hech kim yo'q — u birinchi. Ko'kning o'ngida sariq bor edi — u ikkinchi. Oqning o'ngida ko'k — u oxirgi.",
    band: "105-band", iq: "Teng ahamiyatga ega boʻlgan yoʻllar kesishgan chorrahada relssiz transport vositasining haydovchisi oʻngdan yaqinlashayotgan transport vositalariga yoʻl berishi shart." },
  { id: "tramvay", title: "Tramvay", road: "tram", q: "Teng ahamiyatli chorraha. Oq avtomobil tramvayning o'ng tomonidan kelyapti. Kim birinchi?",
    actors: { T: { kind: "tram", from: "S", to: "N" }, B: { kind: "car", color: "oq", from: "E", to: "W" } },
    options: [{ t: "Oq avtomobil — u o'ngdan kelyapti", order: ["B", "T"] }, { t: "Tramvay", order: ["T", "B"] }], correct: 1,
    e: "Teng ahamiyatli yo'llar chorrahasida tramvay harakat yo'nalishidan qat'i nazar relssiz transportga nisbatan oldin o'tish huquqiga ega. «O'ng qo'l» qoidasi bu yerda ustun emas.",
    band: "105-band", iq: "Bunday chorrahalarda keyingi harakat yoʻnalishidan qatʼiy nazar, tramvay relssiz transport vositalariga nisbatan oldin oʻtish huquqiga ega boʻladi." },
  { id: "tezyordam", title: "Tez yordam", road: "cross", q: "Chap tomondan mayoqcha va sirena yoqilgan tez yordam kelyapti. Kim birinchi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "N" }, M: { kind: "amb", from: "W", to: "E" } },
    options: [{ t: "Oq avtomobil — tez yordam chap tomonida", order: ["A", "M"] }, { t: "Tez yordam", order: ["M", "A"] }], correct: 1,
    e: "Ko'k (qizil) mayoqcha va maxsus tovushli ishora yoqilgan transportga har doim yo'l beriladi — u qaysi tomondan kelishidan qat'i nazar.",
    band: "26-band", iq: "Haydovchilar tezkor va maxsus xizmatlarning koʻk yoki qizil yoxud koʻk va qizil rangli yalt-yalt etuvchi mayoqchalar va maxsus tovushli ishorasi yoqilgan holda yaqinlashayotgan transport vositalariga … yoʻl berishlari shart." },
  { id: "piyoda", title: "Piyodalar o'tish joyi", road: "zebra", q: "Tartibga solinmagan piyodalar o'tish joyi. Piyoda yo'lni kesib o'tmoqchi. Kim birinchi?",
    actors: { A: { kind: "car", color: "kok", from: "S", to: "N" }, P: { kind: "ped" } },
    options: [{ t: "Avtomobil — u tezroq", order: ["A", "P"] }, { t: "Piyoda", order: ["P", "A"] }], correct: 1,
    e: "Tartibga solinmagan piyodalar o'tish joyida haydovchi yo'lni kesib o'tayotgan piyodani o'tkazib yuborish uchun sekinlashishi yoki to'xtashi shart.",
    band: "109-band", iq: "Tartibga solinmagan piyodalar oʻtish joyiga yaqinlashayotgan transport vositasining haydovchisi qatnov qismining shu yoʻnalishini kesib oʻtayotgan piyoda(lar)ni oʻtkazib yuborish uchun tezligini kamaytirishi yoki toʻxtashi shart." },
  { id: "aylanma", title: "Aylanma chorraha", road: "ring", q: "Aylanma harakatlanish chorrahasi. Kim birinchi o'tadi?",
    actors: { R: { kind: "car", color: "qizil", ring: true }, A: { kind: "car", color: "oq", from: "S", ringIn: true } },
    options: [{ t: "Oq — aylanaga kirib kelayotgan", order: ["A", "R"] }, { t: "Qizil — aylanada harakatlanayotgan", order: ["R", "A"] }], correct: 1,
    e: "Aylanma harakatlanish chorrahasida aylanada harakatlanayotgan transport vositalari aylanaga kirib kelayotganlarga nisbatan ustun.",
    band: "98-band", iq: "Aylanma harakatlanish chorrahasida harakatlanayotgan transport vositalari aylanaga kirib kelayotgan transport vositalariga nisbatan ustunlikka (imtiyozga) ega." },
  { id: "poyezd", title: "Temir yo'l kesishmasi", road: "rail", q: "Shlagbaumsiz temir yo'l kesishmasi. Poyezd yaqinlashmoqda. Kim birinchi?",
    actors: { A: { kind: "car", color: "oq", from: "S", to: "N", stop: 12 }, Z: { kind: "train" } },
    options: [{ t: "Avtomobil — ulgurib qoladi", order: ["A", "Z"] }, { t: "Poyezd", order: ["Z", "A"] }], correct: 1,
    e: "Ko'rinish chegarasida poyezd yaqinlashayotgan bo'lsa, temir yo'l kesishmasiga kirish taqiqlanadi. Poyezdni tormozlash yo'li yuzlab metr — u to'xtay olmaydi.",
    band: "118-band", iq: "Quyidagi hollarda temir yoʻl kesishmasiga kirish taqiqlanadi: … agar koʻrinish chegarasidagi masofada kesishmaga poyezd (lokomotiv, drezina) yaqinlashayotgan boʻlsa." },
];
const COLORS = { oq: [0xf2f2f2, "Oq"], kok: [0x2f6fd6, "Ko'k"], qizil: [0xd63030, "Qizil"], sariq: [0xf2c200, "Sariq"] };
const FREE = 3;

// ---------- YORDAMCHILAR ----------
const LANE = 1.8, FAR = 46, STOP = 10.5;
const V2 = (x, z) => new THREE.Vector2(x, z);
const DIRS = { S: { p: V2(LANE, FAR), d: V2(0, -1) }, N: { p: V2(-LANE, -FAR), d: V2(0, 1) }, E: { p: V2(FAR, -LANE), d: V2(-1, 0) }, W: { p: V2(-FAR, LANE), d: V2(1, 0) } };
const EXIT = { N: { p: V2(LANE, -STOP), d: V2(0, -1) }, S: { p: V2(-LANE, STOP), d: V2(0, 1) }, E: { p: V2(STOP, LANE), d: V2(1, 0) }, W: { p: V2(-STOP, -LANE), d: V2(-1, 0) } };
function polyline(pts, step = 0.2) {   // zich nuqtalar + uzunliklar
  const out = [pts[0].clone()];
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(a.distanceTo(b) / step)); for (let k = 1; k <= n; k++) out.push(a.clone().lerp(b, k / n)); }
  const s = [0]; for (let i = 1; i < out.length; i++) s.push(s[i - 1] + out[i].distanceTo(out[i - 1]));
  return { pts: out, s, len: s[s.length - 1] };
}
const bez = (a, c, b, n = 24) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return V2(u * u * a.x + 2 * u * t * c.x + t * t * b.x, u * u * a.y + 2 * u * t * c.y + t * t * b.y); });
function lineX(p0, d0, p1, d1) { const det = d0.x * d1.y - d0.y * d1.x; if (Math.abs(det) < 1e-6) return p0.clone().lerp(p1, 0.5); const t = ((p1.x - p0.x) * d1.y - (p1.y - p0.y) * d1.x) / det; return p0.clone().addScaledVector(d0, t); }
function route(from, to, stop = STOP) {
  const st = DIRS[from], stopP = st.p.clone().addScaledVector(st.d, FAR - stop), ex = EXIT[to], end = ex.p.clone().addScaledVector(ex.d, FAR - STOP);
  const mid = from && to && st.d.dot(ex.d) > 0.9 ? [stopP, ex.p] : bez(stopP, lineX(stopP, st.d, ex.p, ex.d), ex.p);
  const P = polyline([st.p, ...mid, end]); P.stopS = FAR - stop; return P;
}
function at(P, s) { s = Math.max(0, Math.min(P.len, s)); let lo = 0, hi = P.s.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P.s[m] <= s) lo = m; else hi = m; }
  const a = P.pts[lo], b = P.pts[hi], t = (s - P.s[lo]) / ((P.s[hi] - P.s[lo]) || 1); const p = a.clone().lerp(b, t), d = b.clone().sub(a).normalize(); return { p, d }; }

// ---------- MESHLAR ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function boxM(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
function wheels(g, xs, zs, r = 0.34) { const wm = M(0x181818); for (const x of xs) for (const z of zs) { const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 16), wm); w.rotation.z = Math.PI / 2; w.position.set(x, r, z); w.castShadow = true; g.add(w); } }
function carMesh(color) {
  const g = new THREE.Group(), body = M(color, { metalness: 0.35, roughness: 0.35 }), glass = M(0x1c2a3a, { metalness: 0.6, roughness: 0.15 });
  g.add(boxM(1.82, 0.62, 4.3, body, 0, 0.62, 0), boxM(1.84, 0.18, 4.32, M(0x2a2a2a), 0, 0.36, 0));
  const cab = boxM(1.62, 0.56, 2.25, glass, 0, 1.2, 0.25); g.add(cab, boxM(1.58, 0.07, 1.9, body, 0, 1.5, 0.3));
  g.add(boxM(1.7, 0.12, 0.9, body, 0, 0.98, -1.45)); // kapot
  [-0.62, 0.62].forEach(x => { g.add(boxM(0.36, 0.14, 0.05, M(0xfff6cc, { emissive: 0xfff2b0, emissiveIntensity: 0.6 }), x, 0.72, -2.16)); g.add(boxM(0.36, 0.14, 0.05, M(0xb71c1c, { emissive: 0x7f0000, emissiveIntensity: 0.6 }), x, 0.74, 2.16)); });
  wheels(g, [-0.86, 0.86], [-1.35, 1.35]);
  g.userData = { len: 4.3, wid: 1.82 }; return g;
}
function ambMesh() {
  const g = new THREE.Group(), w = M(0xf7f7f7), red = M(0xd32f2f), glass = M(0x1c2a3a, { metalness: 0.6, roughness: 0.15 });
  g.add(boxM(2.0, 2.0, 5.2, w, 0, 1.25, 0.3), boxM(2.0, 1.1, 1.3, w, 0, 0.85, -2.5), boxM(1.9, 0.6, 0.1, glass, 0, 1.25, -3.12));
  g.add(boxM(2.02, 0.3, 5.0, red, 0, 1.0, 0.3));
  g.add(boxM(0.8, 0.8, 0.06, w, 0.4, 1.6, 2.92), boxM(0.18, 0.6, 0.07, red, 0.4, 1.6, 2.93), boxM(0.6, 0.18, 0.07, red, 0.4, 1.6, 2.93));
  const lb = M(0x1e5bff, { emissive: 0x1e5bff, emissiveIntensity: 2 }), lr = M(0xff2a2a, { emissive: 0xff2a2a, emissiveIntensity: 2 });
  const b1 = boxM(0.5, 0.18, 0.3, lb, -0.45, 2.34, -1.6), b2 = boxM(0.5, 0.18, 0.3, lr, 0.45, 2.34, -1.6); g.add(b1, b2);
  wheels(g, [-0.95, 0.95], [-1.9, 1.9], 0.4); g.userData = { len: 6.2, wid: 2.0, flash: [lb, lr] }; return g;
}
function tramMesh() {
  const g = new THREE.Group(), red = M(0xc62828), w = M(0xf2f2f2), glass = M(0x1c2a3a, { metalness: 0.6, roughness: 0.15 });
  g.add(boxM(2.5, 2.5, 15, red, 0, 1.75, 0), boxM(2.52, 0.9, 14.6, glass, 0, 2.2, 0), boxM(2.54, 0.4, 15.02, w, 0, 0.75, 0));
  g.add(boxM(0.08, 1.2, 0.08, M(0x333333), 0, 3.5, 0), boxM(1.6, 0.06, 0.08, M(0x333333), 0, 4.1, 0));
  g.userData = { len: 15, wid: 2.5, heavy: true }; return g;
}
function trainMesh() {
  const g = new THREE.Group(), gr = M(0x2e7d32), y = M(0xf9a825), glass = M(0x1c2a3a);
  g.add(boxM(3.1, 3.4, 17, gr, 0, 2.3, 0), boxM(3.12, 0.4, 17.02, y, 0, 1.2, 0), boxM(2.6, 1.0, 0.1, glass, 0, 3.2, -8.52));
  g.add(boxM(3.1, 3.2, 18, M(0x546e7a), 0, 2.2, 18.6));
  g.userData = { len: 17, wid: 3.1, heavy: true, clear: 40 }; return g;
}
function pedMesh() {
  const g = new THREE.Group(), c = M(0x1e88e5), skin = M(0xe0b089), dark = M(0x263238);
  g.add(boxM(0.46, 0.66, 0.3, c, 0, 1.2, 0)); const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), skin); h.position.y = 1.68; h.castShadow = true; g.add(h);
  const legs = [-0.11, 0.11].map(x => { const l = boxM(0.15, 0.85, 0.17, dark, x, 0, 0); l.geometry.translate(0, -0.42, 0); l.position.y = 0.87; g.add(l); return l; });
  g.userData = { len: 0.6, wid: 0.6, legs }; return g;
}
function signMesh(code, x, z, faceRot) {
  const g = new THREE.Group(); g.add(boxM(0.08, 2.4, 0.08, M(0x9e9e9e), 0, 1.2, 0));
  const svg = window.ROADSIGN && window.ROADSIGN(code);
  if (svg) { const img = new Image(), cv = document.createElement("canvas"); cv.width = cv.height = 256; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    img.onload = () => { cv.getContext("2d").drawImage(img, 0, 0, 256, 256); tex.needsUpdate = true; };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); p.position.set(0, 2.55, 0.06); g.add(p);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), M(0xb0b0b0)); back.rotation.y = Math.PI; back.position.set(0, 2.55, 0.03); g.add(back); }
  g.position.set(x, 0, z); g.rotation.y = faceRot; return g;
}

// ---------- SAHNA ----------
function buildWorld(scene, road) {
  scene.background = new THREE.Color(0xbfdcf2); scene.fog = new THREE.Fog(0xbfdcf2, 60, 140);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x557a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff3e0, 1.8); sun.position.set(-20, 40, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40 }); scene.add(sun);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(0x6aa84f, { roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
  const asph = M(0x4f5359, { roughness: 0.95 }), walk = M(0xc9c4b8), white = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), yellow = new THREE.MeshBasicMaterial({ color: 0xf2c200 });
  const flat = (w, d, x, z, mat, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  const dashZ = (x, z0, z1) => { for (let z = z0; z < z1; z += 6) flat(0.15, 3, x, z + 1.5, white, 0.03); };
  const dashX = (z, x0, x1) => { for (let x = x0; x < x1; x += 6) flat(3, 0.15, x + 1.5, z, white, 0.03); };
  const tree = (x, z) => { const t = new THREE.Group(); t.add(boxM(0.3, 1.8, 0.3, M(0x6d4c41), 0, 0.9, 0)); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), M(0x2e7d32, { flatShading: true })); c.position.y = 2.9; c.castShadow = true; t.add(c); t.position.set(x, 0, z); scene.add(t); };
  const W = 7.2;
  if (road === "cross" || road === "main" || road === "tram") {
    flat(W, 200, 0, 0, asph, 0.01); flat(200, W, 0, 0, asph, 0.012);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { flat(3, 90, sx * (W / 2 + 1.5), sz * 50, walk); flat(90, 3, sx * 50, sz * (W / 2 + 1.5), walk); }
    dashZ(0, -100, -STOP); dashZ(0, STOP, 100); if (road !== "main") { dashX(0, -100, -STOP); dashX(0, STOP, 100); } else { flat(200 - 2 * STOP, 0.15, 0, 0, white, 0.03); flat(200, 0.15, 0, 0, white, 0.031).visible = false; }
    if (road === "main") { scene.add(signMesh("2.4", W / 2 + 1.2, STOP + 1, 0), signMesh("2.4", -W / 2 - 1.2, -STOP - 1, Math.PI), signMesh("2.1", -STOP - 1, W / 2 + 1.2, -Math.PI / 2), signMesh("2.1", STOP + 1, -W / 2 - 1.2, Math.PI / 2));
      flat(W / 2, 0.4, LANE, STOP - 0.3, white); flat(W / 2, 0.4, -LANE, -STOP + 0.3, white); }
    if (road === "tram") { const rail = M(0x8a8a8a, { metalness: 0.8 }); for (const x of [-0.72, 0.72]) scene.add(boxM(0.08, 0.06, 200, rail, x, 0.04, 0)); }
    [[14, 14], [-14, 16], [16, -14], [-15, -15], [22, 24], [-24, 22], [26, -26], [-22, -28]].forEach(([x, z]) => tree(x, z));
  } else if (road === "zebra") {
    flat(W, 200, 0, 0, asph, 0.01); flat(3, 200, W / 2 + 1.5, 0, walk); flat(3, 200, -W / 2 - 1.5, 0, walk); dashZ(0, -100, 100);
    for (let x = -W / 2 + 0.4; x < W / 2; x += 0.9) flat(0.5, 4, x, -4, white, 0.03);
    scene.add(signMesh("5.16.1", W / 2 + 1.2, -2, 0), signMesh("5.16.2", -W / 2 - 1.2, -6, Math.PI));
    [[10, 6], [-10, -12], [11, -20], [-11, 14], [12, 26]].forEach(([x, z]) => tree(x, z));
  } else if (road === "ring") {
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.5, 13, 64), asph); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.015; ring.receiveShadow = true; scene.add(ring);
    const isl = new THREE.Mesh(new THREE.CircleGeometry(5.5, 48), M(0x7cb342)); isl.rotation.x = -Math.PI / 2; isl.position.y = 0.03; scene.add(isl);
    for (const [w, d, x, z] of [[W, 90, 0, 56], [W, 90, 0, -56], [90, W, 56, 0], [90, W, -56, 0]]) flat(w, d, x, z, asph, 0.01);
    tree(0, 0); tree(16, 16); tree(-17, 15); tree(16, -17); tree(-16, -16);
    for (let a = 0; a < 64; a++) if (a % 2) { const t = a / 64 * Math.PI * 2; const m = flat(0.15, 1.2, Math.cos(t) * 9.2, Math.sin(t) * 9.2, white, 0.03); m.rotation.z = -t; }
    flat(W / 2, 0.3, LANE, 13.6, white);
  } else if (road === "rail") {
    flat(W, 200, 0, 0, asph, 0.01); dashZ(0, -100, -6); dashZ(0, 6, 100);
    const bal = flat(200, 5, 0, 0, M(0x8d8a80), 0.02); bal.position.y = 0.02;
    for (let x = -100; x < 100; x += 1.2) scene.add(boxM(0.25, 0.08, 3.2, M(0x5d4037), x, 0.05, 0));
    const rail = M(0x9e9e9e, { metalness: 0.8 }); for (const z of [-0.76, 0.76]) scene.add(boxM(200, 0.14, 0.09, rail, 0, 0.12, z));
    scene.add(signMesh("1.2", W / 2 + 1.2, 30, 0), signMesh("1.3.1", W / 2 + 1.2, 6, 0), signMesh("1.3.1", -W / 2 - 1.2, -6, Math.PI));
    flat(W / 2, 0.4, LANE, 9, white);
    [[14, 14], [-16, 18], [18, -16], [-14, -20]].forEach(([x, z]) => tree(x, z));
  }
}

// ---------- OVOZ ----------
const Snd = {
  x: null, init() { try { this.x ||= new (window.AudioContext || window.webkitAudioContext)(); this.x.resume?.(); } catch (e) {} },
  noise(dur, f0, f1, vol, type = "bandpass") { const x = this.x; if (!x) return; const n = x.createBuffer(1, x.sampleRate * dur, x.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); const s = x.createBufferSource(), f = x.createBiquadFilter(), g = x.createGain(), t = x.currentTime;
    s.buffer = n; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = 3; g.gain.value = vol; s.connect(f).connect(g).connect(x.destination); s.start(); },
  tone(f, dur, vol = 0.15, type = "sine") { const x = this.x; if (!x) return; const o = x.createOscillator(), g = x.createGain(), t = x.currentTime; o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g).connect(x.destination); o.start(); o.stop(t + dur); },
  screech() { this.noise(0.9, 3200, 1800, 0.5); }, crash() { this.noise(0.6, 900, 120, 1.2, "lowpass"); this.tone(70, 0.4, 0.6); setTimeout(() => this.noise(0.4, 4000, 2500, 0.4), 120); },
  ok() { this.tone(660, 0.15, 0.2); setTimeout(() => this.tone(990, 0.25, 0.2), 140); }, tick() { this.tone(1200, 0.05, 0.08, "square"); },
  siren(on) { const x = this.x; if (!x) return; if (on && !this.sir) { const o = x.createOscillator(), g = x.createGain(); o.type = "triangle"; g.gain.value = 0.06; o.connect(g).connect(x.destination); o.start();
      this.sir = { o, g, iv: setInterval(() => { o.frequency.setValueAtTime(o.frequency.value > 800 ? 650 : 960, x.currentTime); }, 450) }; }
    else if (!on && this.sir) { clearInterval(this.sir.iv); this.sir.o.stop(); this.sir = null; } },
};
const hap = (k, v) => window.Telegram?.WebApp?.HapticFeedback?.[k]?.(v);

// ---------- O'YINCHI ----------
const $ = id => document.getElementById(id);
const Vz = {
  i: 0, run: false,
  open() {
    const paid = window.ME?.paid || (typeof ME !== "undefined" && ME && ME.paid);
    $("app").innerHTML = `<h1>🎬 Vaziyatli savollar</h1><p>3D chorrahada kim birinchi o'tishini toping. Noto'g'ri javob bersangiz — transport vositalari to'qnashadi va to'g'ri tartib ko'rsatiladi.</p>` +
      SC.map((s, i) => { const lock = !paid && i >= FREE; return `<button class="tile" onclick="${lock ? "buy()" : `Vz.play(${i})`}"><span class="ic">${["🚦", "🔶", "↰", "🚗", "🚋", "🚑", "🚶", "⭕", "🚂"][i] || "🎬"}</span><div><b>${i + 1}. ${s.title}${lock ? " 🔒" : ""}</b><span>YHQ ${s.band}</span></div></button>`; }).join("") +
      `<button class="btn ghost" onclick="home()">Orqaga</button>`;
  },
  init() {
    if (this.r) return;
    const cv = $("vzcv"); this.r = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); this.r.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.r.shadowMap.enabled = true; this.r.shadowMap.type = THREE.PCFSoftShadowMap; this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 1.0;
    this.cam = new THREE.PerspectiveCamera(48, 1, 0.1, 400); addEventListener("resize", () => this.resize());
  },
  resize() { if (!this.r) return; const w = innerWidth, h = innerHeight; this.r.setSize(w, h, false); $("vzcv").style.width = w + "px"; $("vzcv").style.height = h + "px"; this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); },
  play(i) {
    this.i = i; const sc = this.sc = SC[i]; Snd.init(); this.init();
    $("vz").style.display = "block"; this.resize();
    const scene = this.scene = new THREE.Scene(); buildWorld(scene, sc.road);
    $("vzL").innerHTML = ""; this.A = {}; this.green = [];
    for (const [k, a] of Object.entries(sc.actors)) {
      let mesh, P, label, vmax = 7;
      if (a.kind === "car") { mesh = carMesh(COLORS[a.color][0]); label = COLORS[a.color][1]; }
      if (a.kind === "amb") { mesh = ambMesh(); label = "Tez yordam"; vmax = 9; }
      if (a.kind === "tram") { mesh = tramMesh(); label = "Tramvay"; vmax = 6; }
      if (a.kind === "train") { mesh = trainMesh(); label = "Poyezd"; vmax = 14; }
      if (a.kind === "ped") { mesh = pedMesh(); label = "Piyoda"; vmax = 1.5; }
      if (a.from && a.to && a.kind !== "tram") P = route(a.from, a.to, a.stop || STOP);
      if (a.kind === "tram") { P = polyline([V2(0, FAR + 10), V2(0, -FAR - 30)]); P.stopS = FAR + 10 - 16; }
      if (a.kind === "ped") { P = polyline([V2(-6.5, -4), V2(-4.2, -4), V2(6.5, -4)]); P.stopS = 2.3; }
      if (a.kind === "train") { P = polyline([V2(-110, 0), V2(140, 0)]); P.stopS = 52; }
      if (a.ring) { const pts = []; for (let t = 0; t <= 1.6; t += 0.01) { const ang = Math.PI - t * Math.PI * 2; pts.push(V2(Math.cos(ang) * 9.2, Math.sin(ang) * 9.2)); } P = polyline(pts); P.stopS = 9.2 * Math.PI * 0.18; }
      if (a.ringIn) { P = polyline([V2(LANE, FAR), V2(LANE, 16), ...bez(V2(LANE, 16), V2(LANE, 9.6), V2(6.5, 6.5), 16).slice(1),
        ...Array.from({ length: 20 }, (_, j) => { const ang = Math.PI / 4 - j / 19 * Math.PI / 4; return V2(Math.cos(ang) * 9.2, Math.sin(ang) * 9.2); }).slice(1),
        ...bez(V2(9.2, 0), V2(11, LANE), V2(16, LANE), 10).slice(1), V2(FAR, LANE)]); P.stopS = FAR - 16; }
      mesh.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(mesh);
      const lb = document.createElement("div"); lb.className = "vzlab"; lb.textContent = label; $("vzL").appendChild(lb);
      this.A[k] = { k, a, mesh, P, s: 0, v: 0, vmax, mode: "approach", lb, label, delay: 0, rot: 0, vel: new THREE.Vector2(), spin: 0, off: new THREE.Vector2() };
    }
    // aylanadagi transport biroz oldinroqdan boshlaydi
    if (this.A.R) this.A.R.s = 0;
    this.phase = "intro"; this.t = 0; this.crashed = false; this.shake = 0; this.parts = [];
    $("vzQ").innerHTML = `<div class="vzh">KIM BIRINCHI?</div><div class="vzsub">${sc.title}</div>`; $("vzQ").style.display = "block";
    $("vzO").innerHTML = ""; $("vzC").textContent = ""; $("vzC").style.display = "none"; $("vzR").style.display = "none"; $("vzF").className = "";
    this.run = true; this.last = performance.now(); const gen = this.gen = (this.gen || 0) + 1; requestAnimationFrame(t => this.loop(t, gen));
  },
  ask() {
    const sc = this.sc; this.phase = "ask"; this.left = 10;
    $("vzQ").innerHTML = `<div class="vzh">IMTIHON SAVOLI</div><div class="vzcard">${sc.q}<span class="vzt" id="vzT">10</span></div>`;
    $("vzO").innerHTML = sc.options.map((o, k) => `<button onclick="Vz.answer(${k})"><b>${k + 1}</b>${o.t}</button>`).join("");
  },
  answer(k) {
    if (this.phase !== "ask") return; const sc = this.sc, ok = k === sc.correct; this.user = k; this.ok = ok;
    [...$("vzO").children].forEach((b, j) => { b.disabled = true; b.classList.add(j === sc.correct ? "good" : j === k ? "bad" : "dim"); });
    $("vzQ").querySelector(".vzh").textContent = ok ? "TO'G'RI JAVOB" : k < 0 ? "VAQT TUGADI" : "NOTO'G'RI";
    if (ok) { Snd.ok(); hap("notificationOccurred", "success"); }
    setTimeout(() => { $("vzO").innerHTML = ""; this.start(ok || k < 0 ? sc.options[sc.correct].order : sc.options[k].order, ok || k < 0); }, 900);
  },
  // tartib bo'yicha harakat; noto'g'ri tartibda — ustunlikka ega transport ham yo'lga chiqadi va to'qnashuv bo'ladi
  start(order, correctPlay) {
    const sc = this.sc, cor = sc.options[sc.correct].order; this.phase = "play"; this.queue = [];
    Object.values(this.A).forEach(a => { if (a.mode !== "done") a.mode = "hold"; });
    if (sc.actors.M) Snd.siren(true);
    let mis = -1; if (!correctPlay) for (let i = 0; i < order.length; i++) if (order[i] !== cor[i]) { mis = i; break; }
    if (mis < 0) { this.queue = [...order]; this.release(this.queue.shift()); this.correctPlay = true; this.showGreen(cor); return; }
    this.correctPlay = false;
    cor.slice(0, mis).forEach(k => this.release(k));              // oldingilari to'g'ri o'tadi
    const c = order[mis], before = cor.slice(mis, cor.indexOf(c)), p = before.find(k => this.conflict(c, k) !== null) || before[0];
    // ikkalasini kesishish nuqtasiga bir vaqtda yetadigan qilib yuborish
    const tc = this.tReach(this.A[c], this.conflict(c, p)), tp = this.tReach(this.A[p], this.conflict(p, c));
    this.release(c, Math.max(0, tp - tc)); this.release(p, Math.max(0, tc - tp));
  },
  release(k, delay = 0) { const a = this.A[k]; if (!a) return; a.mode = "go"; a.delay = delay; },
  conflict(k1, k2) { const a = this.A[k1], b = this.A[k2]; let best = 1e9, sa = null;
    for (let i = 0; i < a.P.pts.length; i += 3) for (let j = 0; j < b.P.pts.length; j += 3) { const d = a.P.pts[i].distanceTo(b.P.pts[j]); if (d < best) { best = d; sa = a.P.s[i]; } }
    return best < 2.5 ? sa : null; },
  tReach(a, sT) { const d = Math.max(0, (sT ?? a.P.len) - a.s), acc = a.a?.kind === "train" ? 2 : 3, dv = a.vmax * a.vmax / (2 * acc);
    return d < dv ? Math.sqrt(2 * d / acc) : a.vmax / acc + (d - dv) / a.vmax; },
  showGreen(order) {
    const first = this.A[order[0]]; if (!first) return;
    const pts = first.P.pts.filter((p, i) => first.P.s[i] >= first.s), mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.75 });
    for (let i = 0; i < pts.length - 1; i += 2) { const a = pts[i], b = pts[Math.min(pts.length - 1, i + 2)], m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, a.distanceTo(b) + 0.05), mat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(b.x - a.x, -(b.y - a.y)); m.position.set((a.x + b.x) / 2, 0.05, (a.y + b.y) / 2); this.scene.add(m); this.green.push(m); }
    order.forEach((k, i) => { const A = this.A[k]; A.lb.textContent = `${i === 0 ? "✅" : "✋"} ${A.label}${i ? " — kutadi" : " — birinchi o'tadi"}`; A.lb.classList.add(i ? "wait" : "first"); });
  },
  crash(a, b) {
    if (this.crashed) return; this.crashed = true; Snd.screech(); setTimeout(() => Snd.crash(), 160); hap("notificationOccurred", "error"); this.shake = 0.6;
    const ped = a.a.kind === "ped" || b.a.kind === "ped";
    for (const [x, y] of [[a, b], [b, a]]) {
      if (x.a.kind === "ped") { x.mode = "stop"; continue; }
      const heavy = x.mesh.userData.heavy, d = at(x.P, x.s).d, dy = at(y.P, y.s).d;
      if (ped) { x.mode = "brake"; continue; }
      if (heavy) { x.mode = "slide"; x.vel.copy(d).multiplyScalar(x.v * 0.85); x.spin = 0; }
      else { x.mode = "slide"; x.vel.copy(d).multiplyScalar(x.v * 0.35).addScaledVector(dy, y.v * (y.mesh.userData.heavy ? 1 : 0.6)); x.spin = (Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random() * 2); }
    }
    if (!ped) { const c = at(a.P, a.s).p.clone().lerp(at(b.P, b.s).p, 0.5);
      for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), M(i % 3 ? 0x9fd3ff : 0xffb300, { emissive: i % 3 ? 0x000000 : 0xff6f00 }));
        m.position.set(c.x, 0.9, c.y); this.scene.add(m); this.parts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 9, 3 + Math.random() * 5, (Math.random() - 0.5) * 9) }); } }
    $("vzF").className = "on"; $("vzF").textContent = ped ? "⚠️ Piyodani urib yuborishingizga oz qoldi!" : "💥 TO'QNASHUV!";
    setTimeout(() => this.afterCrash(), 2600);
  },
  afterCrash() {
    if (!this.run || this.phase === "after") return; this.phase = "after"; Snd.siren(false); $("vzF").className = "";
    const sc = this.sc; $("vzQ").innerHTML = `<div class="vzh">NEGA ${sc.correct + 1}-VARIANT?</div><div class="vzcard">To'g'ri javob: <b>${sc.options[sc.correct].t}</b></div>`;
    $("vzO").innerHTML = `<button class="wide" onclick="Vz.replay()">▶ To'g'ri tartibni ko'rish</button>`;
  },
  replay() {   // sahnani qayta qurib, to'g'ri tartibni yashil chiziq bilan ko'rsatamiz
    const i = this.i; this.play(i); this.phase = "intro-replay";
  },
  finish() {
    const sc = this.sc; Snd.siren(false); this.phase = "end";
    $("vzQ").innerHTML = `<div class="vzh">YHQ ${sc.band.toUpperCase()}</div>`;
    $("vzR").style.display = "block";
    $("vzR").innerHTML = `<div class="vzres ${this.ok ? "ok" : "no"}">${this.ok ? "✅ Siz to'g'ri javob berdingiz" : "❌ Javobingiz noto'g'ri edi"}</div><p>💡 ${sc.e}</p><div class="quote">📜 YHQ, ${sc.band}: «${sc.iq}»</div>
      <div class="vzbtns">${this.i + 1 < SC.length ? `<button class="btn" onclick="Vz.next()">Keyingi vaziyat →</button>` : ""}<button class="btn ghost" onclick="Vz.play(Vz.i)">Qayta</button><button class="btn ghost" onclick="Vz.close()">Ro'yxat</button></div>`;
  },
  next() { const paid = typeof ME !== "undefined" && ME && ME.paid; if (!paid && this.i + 1 >= FREE) { this.close(); return buy(); } this.play(this.i + 1); },
  close() { this.run = false; Snd.siren(false); $("vz").style.display = "none"; this.open(); },
  loop(now, gen) {
    if (!this.run || gen !== this.gen) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.t += dt;
    this.update(dt); this.render(dt); requestAnimationFrame(t => this.loop(t, gen));
  },
  update(dt) {
    const A = Object.values(this.A);
    if (this.phase === "intro" || this.phase === "intro-replay") {
      let all = true;
      for (const a of A) { if (a.mode !== "approach") continue; const rem = a.P.stopS - a.s, vt = Math.min(a.vmax, Math.sqrt(Math.max(0, 2 * 3 * rem)));
        a.v += Math.sign(vt - a.v) * Math.min(Math.abs(vt - a.v), (vt > a.v ? 4 : 8) * dt); a.s += a.v * dt;
        if (rem < 0.05) { a.s = a.P.stopS; a.v = 0; a.mode = "hold"; } else all = false; }
      if (all && this.t > 1.2) { if (this.phase === "intro") this.ask(); else { this.ok = this.ok ?? false; this.start(this.sc.options[this.sc.correct].order, true); } }
    }
    if (this.phase === "ask") { const l = Math.ceil(this.left -= dt); const el = $("vzT"); if (el && el.textContent != l) { el.textContent = Math.max(0, l); Snd.tick(); } if (this.left <= 0) this.answer(-1); }
    for (const a of A) {
      if (a.mode === "go") { if (a.delay > 0) { a.delay -= dt; continue; } const acc = a.a.kind === "train" ? 2 : 3; a.v = Math.min(a.vmax, a.v + acc * dt); a.s += a.v * dt; if (a.s >= a.P.len) { a.mode = "done"; a.mesh.visible = false; a.lb.style.display = "none"; } }
      if (a.mode === "brake") { a.v = Math.max(0, a.v - 10 * dt); a.s += a.v * dt; }
      if (a.mode === "slide") { a.off.addScaledVector(a.vel, dt); a.vel.multiplyScalar(Math.exp(-1.6 * dt)); a.rot += a.spin * dt; a.spin *= Math.exp(-1.8 * dt); }
      if (a.a.kind === "ped" && a.mode === "go") { const t = this.t * 9; a.mesh.userData.legs[0].rotation.x = Math.sin(t) * 0.5; a.mesh.userData.legs[1].rotation.x = -Math.sin(t) * 0.5; }
      if (a.mesh.userData.flash) { const on = Math.floor(this.t * 6) % 2; a.mesh.userData.flash[0].emissiveIntensity = on ? 3 : 0.2; a.mesh.userData.flash[1].emissiveIntensity = on ? 0.2 : 3; }
    }
    // to'g'ri tartib: navbatdagisi oldingisi kesishish nuqtasidan o'tgach yuradi
    if (this.phase === "play" && this.correctPlay) {
      const goers = A.filter(a => a.mode === "go"), nxt = this.queue[0];
      if (nxt) { const n = this.A[nxt], blocking = goers.filter(g => { const c = this.conflict(g.k, nxt); return c !== null && g.s < c + (g.mesh.userData.clear || g.mesh.userData.len || 4) + 2; }); if (!blocking.length) this.release(this.queue.shift()); }
      if (!this.queue.length && A.every(a => a.mode === "done" || a.mode === "hold" && !this.sc.options[this.sc.correct].order.includes(a.k))) { this.phase = "fin"; setTimeout(() => this.finish(), 300); }
    }
    // to'qnashuvni aniqlash (har bir transport — ikkita doira)
    if (this.phase === "play" && !this.correctPlay && !this.crashed) {
      const mv = A.filter(a => a.mode === "go" && a.delay <= 0);
      for (let i = 0; i < mv.length; i++) for (let j = i + 1; j < mv.length; j++) { const a = mv[i], b = mv[j];
        const near = a.a.kind === "ped" || b.a.kind === "ped" ? 5.5 : 1.7;
        if (this.circles(a).some(p => this.circles(b).some(q => p.distanceTo(q) < near + (a.mesh.userData.heavy || b.mesh.userData.heavy ? 0.7 : 0)))) { this.crash(a, b); break; } }
      if (!this.crashed && A.every(a => a.mode !== "go")) this.afterCrash();
    }
    for (const p of this.parts) { p.v.y -= 15 * dt; p.m.position.addScaledVector(p.v, dt); if (p.m.position.y < 0.06) { p.m.position.y = 0.06; p.v.multiplyScalar(0.4); } p.m.rotation.x += dt * 8; }
    if (this.shake > 0) this.shake -= dt;
  },
  circles(a) {   // transport uzunligi bo'ylab doiralar (uzun tramvay/poyezd uchun ko'proq)
    const { p, d } = at(a.P, a.s), len = a.mesh.userData.len || 4.3, L = len / 2 - 0.9, n = Math.max(2, Math.round(len / 2.2)), c = p.clone().add(a.off);
    return Array.from({ length: n }, (_, i) => c.clone().addScaledVector(d, L - (2 * L) * i / (n - 1))); },
  render(dt) {
    const w = innerWidth, h = innerHeight;
    for (const a of Object.values(this.A)) {
      const { p, d } = at(a.P, a.s); a.mesh.position.set(p.x + a.off.x, 0, p.y + a.off.y); a.mesh.rotation.set(0, Math.atan2(-d.x, -d.y) + a.rot, 0);
      if (a.mesh.visible) { const v = new THREE.Vector3(a.mesh.position.x, a.a.kind === "train" ? 5 : a.a.kind === "tram" ? 4.6 : 2.6, a.mesh.position.z).project(this.cam);
        a.lb.style.display = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 ? "block" : "none"; a.lb.style.left = ((v.x + 1) / 2 * w) + "px"; a.lb.style.top = ((1 - v.y) / 2 * h) + "px"; }
    }
    const sc = this.sc, far = sc.road === "rail" ? 1.15 : 1, ang = 0.62 + Math.sin(this.t * 0.12) * 0.12;
    const R = (w < h ? 50 : 36) * far, Hh = (w < h ? 54 : 30) * far;
    this.cam.position.set(Math.sin(ang) * R * 0.55, Hh, Math.cos(ang) * R);
    if (this.shake > 0) this.cam.position.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), 0).multiplyScalar(this.shake * 1.2));
    this.cam.lookAt(0, 0, w < h ? 5 : 1);
    this.r.render(this.scene, this.cam);
  },
};
window.Vz = Vz;
