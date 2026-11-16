// Qoidalar animatsiyasi (SVG + SMIL). Har bir sahna YHQ bandi bilan bog'langan; savol izohida ko'rsatiladi.
(function () {
  const W = 300, H = 200, DUR = 8;
  const asf = "#5c6066", line = "#f4f4f4", grass = "#7cb342", side = "#c9c4b8";
  const split2 = t => { if (t.length <= 44) return [t]; const w = t.split(" "); let a = "", best = [t, ""], bd = 1e9;
    for (let i = 1; i < w.length; i++) { const l = w.slice(0, i).join(" "), r = w.slice(i).join(" "), d = Math.max(l.length, r.length); if (d < bd) { bd = d; best = [l, r]; } } return best; };
  const wrap = (inner, cap, bg = grass) => { const ls = cap ? split2(cap) : [], hh = ls.length * 14 + 8;
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${bg}"/>${inner}${cap ? `<rect x="0" y="${H - hh}" width="${W}" height="${hh}" fill="rgba(0,0,0,.65)"/>` +
      ls.map((l, i) => `<text x="${W / 2}" y="${H - hh + 15 + i * 14}" font-family="Arial" font-size="11.5" font-weight="700" fill="#fff" text-anchor="middle">${l}</text>`).join("") : ""}</svg>`; };
  const hroad = (y, w = 60, center = "dash") => `<rect x="0" y="${y - w / 2}" width="${W}" height="${w}" fill="${asf}"/>` +
    (center === "dash" ? `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${line}" stroke-width="2" stroke-dasharray="12 10"/>` : center === "solid" ? `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${line}" stroke-width="2.5"/>` : "");
  const vroad = (x, w = 60, center = "dash") => `<rect x="${x - w / 2}" y="0" width="${w}" height="${H}" fill="${asf}"/>` +
    (center === "dash" ? `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${line}" stroke-width="2" stroke-dasharray="12 10"/>` : "");
  const box = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${asf}"/>`;
  // mashina (yuqoridan, old tomoni +x): rang, ixtiyoriy bezak
  const carG = (col, extra = "") => `<rect x="-12" y="-6.5" width="24" height="13" rx="3.5" fill="${col}" stroke="rgba(0,0,0,.35)"/><rect x="3" y="-5.5" width="5" height="11" rx="1.5" fill="#cfe8ff"/><rect x="-9" y="-5.5" width="4" height="11" rx="1.5" fill="#cfe8ff" opacity=".8"/>${extra}`;
  // harakat: yo'l, vaqt nuqtalari (0..1), yo'ldagi ulushlar
  const mover = (inner, path, kt, kp, rotate = "auto") =>
    `<g>${inner}<animateMotion dur="${DUR}s" repeatCount="indefinite" path="${path}" keyTimes="${kt}" keyPoints="${kp}" calcMode="linear" rotate="${rotate}"/></g>`;
  const blink = (fill, kt = "0;0.5;1", vals = "1;0;1", dur = 0.8) => `<animate attributeName="opacity" values="${vals}" keyTimes="${kt}" dur="${dur}s" repeatCount="indefinite"/>`;
  const sigL = (on = true) => on ? `<circle cx="11" cy="-6" r="2.2" fill="#ffb300">${blink()}</circle><circle cx="-11" cy="-6" r="2.2" fill="#ffb300">${blink()}</circle>` : "";
  const sigR = () => `<circle cx="11" cy="6" r="2.2" fill="#ffb300">${blink()}</circle><circle cx="-11" cy="6" r="2.2" fill="#ffb300">${blink()}</circle>`;
  const hazard = () => sigL() + sigR();
  const zebraV = (x, y0, y1, w = 18) => Array.from({ length: Math.floor((y1 - y0) / 8) }, (_, i) => `<rect x="${x}" y="${y0 + i * 8 + 1}" width="${w}" height="4.5" fill="${line}"/>`).join("");
  const zebraH = (y, x0, x1, h = 18) => Array.from({ length: Math.floor((x1 - x0) / 8) }, (_, i) => `<rect x="${x0 + i * 8 + 1}" y="${y}" width="4.5" height="${h}" fill="${line}"/>`).join("");
  const person = (col = "#1e3a8a") => `<circle r="4.5" fill="${col}"/><circle r="2.6" fill="#f2c9a0"/>`;
  const label = (x, y, t, col = "#fff", size = 11) => `<text x="${x}" y="${y}" font-family="Arial" font-size="${size}" font-weight="700" fill="${col}" text-anchor="middle" stroke="rgba(0,0,0,.55)" stroke-width="3" paint-order="stroke">${t}</text>`;
  const S = {};

  // 105-band: teng ahamiyatli yo'llar — o'ngdan kelayotganga yo'l berish
  S.ongdan = () => wrap(hroad(100) + vroad(150) + box(120, 70, 60, 60) +
    mover(carG("#1565c0"), "M165 225 V-25", "0;0.25;0.6;1", "0;0.24;0.24;1") +
    mover(carG("#e53935"), "M325 85 H-25", "0;0.12;0.55;1", "0;0;1;1") +
    label(205, 160, "Siz") + label(270, 70, "o'ngdan"), "Teng yo'llar chorrahasi: o'ngdan kelayotganga yo'l bering");
  // 104-band: ikkinchi darajali yo'ldan — asosiy yo'ldagilarga yo'l berish
  S.asosiy = () => wrap(hroad(100, 64) + vroad(150, 54) + box(123, 68, 54, 64) +
    `<path d="M196 146 L214 146 L205 162 Z" fill="#fff" stroke="#d32f2f" stroke-width="3"/><line x1="205" y1="162" x2="205" y2="176" stroke="#666" stroke-width="2"/>` +
    mover(carG("#1565c0"), "M163 225 V-25", "0;0.25;0.62;1", "0;0.24;0.24;1") +
    mover(carG("#e53935"), "M-25 116 H325", "0;0.1;0.55;1", "0;0;1;1") +
    label(150, 40, "Asosiy yo'l"), "Ikkinchi darajali yo'ldan: asosiy yo'ldagilarga yo'l bering");
  // 107-band: chapga burilishda qarama-qarshidan to'g'riga ketayotganga yo'l berish
  S.chapga = () => wrap(hroad(100) + vroad(150) + box(120, 70, 60, 60) +
    mover(carG("#1565c0", sigL()), "M165 225 V100 Q165 85 150 85 H-25", "0;0.25;0.62;1", "0;0.36;0.36;1") +
    mover(carG("#e53935"), "M135 -25 V225", "0;0.18;0.6;1", "0;0;1;1"),
    "Chapga burilishda qarshidan to'g'riga ketayotganga yo'l bering");
  // 30–43, 99–103: svetofor
  const lightBox = (x, y) => `<rect x="${x}" y="${y}" width="12" height="32" rx="3" fill="#222"/>` +
    `<circle cx="${x + 6}" cy="${y + 6}" r="4" fill="#ff3b30"><animate attributeName="opacity" values="1;1;0.15;0.15;1" keyTimes="0;0.5;0.5;0.98;1" dur="${DUR}s" repeatCount="indefinite"/></circle>` +
    `<circle cx="${x + 6}" cy="${y + 16}" r="4" fill="#ffcc00"><animate attributeName="opacity" values="0.15;0.15;1;1;0.15;0.15" keyTimes="0;0.42;0.42;0.5;0.5;1" dur="${DUR}s" repeatCount="indefinite"/></circle>` +
    `<circle cx="${x + 6}" cy="${y + 26}" r="4" fill="#34c759"><animate attributeName="opacity" values="0.15;0.15;1;1" keyTimes="0;0.5;0.5;1" dur="${DUR}s" repeatCount="indefinite"/></circle>`;
  S.svetofor = () => wrap(hroad(100) + vroad(150) + box(120, 70, 60, 60) + `<rect x="150" y="138" width="30" height="3" fill="#fff"/>` + lightBox(186, 136) +
    mover(carG("#1565c0"), "M165 225 V-25", "0;0.22;0.52;1", "0;0.28;0.28;1") +
    mover(carG("#e53935"), "M-25 115 H325", "0;0.04;0.42;1", "0;0;1;1"),
    "Qizil va sariqda to'xtash chizig'i oldida to'xtang, yashilda yuring");
  // 109–115 va 15–22: piyodalar o'tish joyi
  S.piyoda = () => wrap(`<rect x="0" y="40" width="${W}" height="16" fill="${side}"/><rect x="0" y="144" width="${W}" height="16" fill="${side}"/>` + hroad(100, 88) + zebraV(178, 58, 142, 20) +
    mover(carG("#1565c0"), "M-25 122 H325", "0;0.3;0.74;1", "0;0.52;0.52;1") +
    mover(person(), "M188 160 V40", "0;0.28;0.7;1", "0;0;1;1", "0"),
    "Piyodalar o'tish joyida piyodaga yo'l bering");
  // 82–87: quvib o'tish
  S.quvib = () => wrap(hroad(100, 64) +
    mover(`<rect x="-18" y="-8" width="36" height="16" rx="2" fill="#8d6e63"/><rect x="10" y="-7" width="7" height="14" fill="#cfe8ff"/>`, "M40 116 H260", "0;1", "0;1") +
    mover(carG("#1565c0", `<g>${sigL()}<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.35;0.35;1" dur="${DUR}s" repeatCount="indefinite"/></g>`),
      "M-25 116 H40 C75 116 75 84 110 84 H215 C250 84 250 116 285 116 H330", "0;1", "0;1"),
    "Quvib o'tish: oldin chap burilish chirog'i, qarshida transport yo'qligiga ishonch hosil qiling");
  // 116–120: temir yo'l kesishmasi (119-band: shlagbaumga kamida 5 m qolganda to'xtash)
  S.temiryol = () => wrap(vroad(150, 60, "none") + `<rect x="0" y="56" width="${W}" height="30" fill="#8d8a80"/>` +
    Array.from({ length: 30 }, (_, i) => `<rect x="${i * 10 + 2}" y="58" width="5" height="26" fill="#6d4c41"/>`).join("") +
    `<rect x="0" y="62" width="${W}" height="3" fill="#455a64"/><rect x="0" y="77" width="${W}" height="3" fill="#455a64"/>` +
    `<g transform="translate(184 100)"><rect x="-3" y="-3" width="6" height="6" fill="#333"/><g><rect x="-62" y="-2.5" width="62" height="5" fill="#fff" stroke="#d32f2f" stroke-width="1.5" stroke-dasharray="8 8"/><animateTransform attributeName="transform" type="rotate" values="80;80;0;0;80;80" keyTimes="0;0.1;0.2;0.72;0.82;1" dur="${DUR}s" repeatCount="indefinite"/></g></g>` +
    `<circle cx="196" cy="104" r="4" fill="#ff3b30"><animate attributeName="opacity" values="0;0;1;0;1;0;1;0;0" keyTimes="0;0.08;0.2;0.32;0.44;0.56;0.68;0.8;1" dur="${DUR}s" repeatCount="indefinite"/></circle>` +
    `<line x1="150" y1="128" x2="180" y2="128" stroke="#fff" stroke-width="2"/>` + label(232, 122, "≥ 5 m", "#fff", 10) +
    mover(carG("#1565c0"), "M165 225 V-25", "0;0.18;0.8;1", "0;0.33;0.33;1") +
    mover(`<rect x="-55" y="-9" width="110" height="18" rx="3" fill="#2e7d32"/><rect x="40" y="-7" width="12" height="14" fill="#cfe8ff"/>`, "M-80 71 H380", "0;0.25;0.7;1", "0;0;1;1", "0"),
    "Shlagbaum yopilsa, unga kamida 5 m qolganda to'xtang");
  // 13–14, 48–52: avariya to'xtashi va belgisi (51-band: 15 m / 30 m)
  const tri = `<path d="M0 -8 L8 6 H-8 Z" fill="none" stroke="#e53935" stroke-width="2.5"/>`;
  S.avariya = () => wrap(hroad(96, 64) + `<rect x="0" y="128" width="${W}" height="14" fill="${side}"/>` +
    mover(carG("#1565c0", `<g opacity="0">${hazard()}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.3;0.3;1" dur="${DUR}s" repeatCount="indefinite"/></g>`),
      "M-25 112 H120 C150 112 150 120 180 120 H230", "0;0.3;1", "0;1;1") +
    mover(tri, "M210 121 H110", "0;0.45;0.75;1", "0;0;1;1", "0") +
    `<g opacity="0"><line x1="110" y1="152" x2="210" y2="152" stroke="#fff" stroke-width="1.5"/>${label(160, 168, "aholi punktida 15 m, tashqarida 30 m", "#fff", 10)}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.75;0.75;1" dur="${DUR}s" repeatCount="indefinite"/></g>`,
    "Majburiy to'xtaganda avariya ishorasini yoqing, zarur hollarda to'xtash belgisini qo'ying");
  // 25–29: maxsus transport (ko'k mayoqcha)
  S.maxsus = () => wrap(hroad(100, 64) + `<rect x="0" y="132" width="${W}" height="10" fill="${side}"/>` +
    mover(carG("#1565c0", sigR()), "M-25 116 H90 C115 116 115 126 140 126 H170", "0;0.35;1", "0;1;1") +
    mover(carG("#ffffff", `<rect x="-3" y="-2" width="6" height="4" fill="#e53935"/><circle cx="-2" cy="-6" r="2.5" fill="#1e88e5">${blink("", "0;0.5;1", "1;0;1", 0.4)}</circle><circle cx="-2" cy="6" r="2.5" fill="#e53935">${blink("", "0;0.5;1", "0;1;0", 0.4)}</circle>`),
      "M-25 116 H-25 H325", "0;0.3;0.8;1", "0;0;1;1"),
    "Maxsus tovush va ko'k mayoqcha yoqilgan transportga yo'l bering");
  // 98-band atrofida: aylanma harakatlanish chorrahasi — aylanadagilar ustun
  S.aylanma = () => wrap(`<g transform="translate(0 -24)">` + vroad(150, 46, "none") + hroad(96, 46, "none") + `<circle cx="150" cy="96" r="70" fill="${asf}"/><circle cx="150" cy="96" r="34" fill="${grass}" stroke="#ddd" stroke-width="3"/>` +
    `<line x1="152" y1="172" x2="172" y2="172" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 3"/>` +
    mover(carG("#e53935"), "M150 44 A52 52 0 1 0 150 148 A52 52 0 1 0 150 44", "0;1", "0;1") +
    mover(carG("#1565c0"), "M162 225 V186 Q162 156 178 146 Q200 132 206 108 H325", "0;0.12;0.78;1", "0;0.15;0.15;1") + `</g>`,
    "Aylanmada aylanadagi transport ustun — kirishda yo'l bering");
  // 77–81: tezlik — aholi punktiga kirishda sekinlashish
  S.tezlik = () => wrap(hroad(110, 60) + `<rect x="150" y="54" width="44" height="22" fill="#fff" stroke="#111" stroke-width="2"/>${label(172, 69, "XIVA", "#111", 10).replace(/stroke="rgba[^"]*"/, "")}<line x1="172" y1="76" x2="172" y2="80" stroke="#666" stroke-width="2"/>` +
    mover(carG("#1565c0"), "M-25 125 H325", "0;0.5;1", "0;0.62;1") +
    `<g transform="translate(46 50)"><circle r="26" fill="#111" stroke="#666" stroke-width="2"/><line x1="0" y1="0" x2="0" y2="-20" stroke="#ff3b30" stroke-width="3" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" values="60;60;0;0" keyTimes="0;0.45;0.6;1" dur="${DUR}s" repeatCount="indefinite"/></line><circle r="3" fill="#ddd"/></g>`,
    "Aholi punkti belgisidan keyin tezlikni kamaytiring");
  // 88–95: to'xtash — o'ng chetga, yo'l chetiga parallel
  S.toxtash = () => wrap(hroad(96, 64) + `<rect x="0" y="128" width="${W}" height="16" fill="${side}"/>` +
    mover(carG("#1565c0", `<g>${sigR()}<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.6;0.6;1" dur="${DUR}s" repeatCount="indefinite"/></g>`), "M-25 112 H120 C150 112 150 120 180 120 H220", "0;0.6;1", "0;1;1"),
    "To'xtashdan oldin o'ng chiroqni yoqing, yo'l chetiga parallel to'xtang");
  // 44–47, 53–76: qayta tizilish (manyovr)
  S.qayta = () => wrap(`<rect x="0" y="54" width="${W}" height="92" fill="${asf}"/><line x1="0" y1="84" x2="${W}" y2="84" stroke="${line}" stroke-width="2" stroke-dasharray="12 10"/><line x1="0" y1="116" x2="${W}" y2="116" stroke="${line}" stroke-width="2" stroke-dasharray="12 10"/>` +
    mover(carG("#e53935"), "M40 100 H340", "0;0.45;1", "0;1;1") +
    mover(carG("#1565c0", `<g>${sigL()}<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.6;0.6;1" dur="${DUR}s" repeatCount="indefinite"/></g>`), "M-25 130 H140 C175 130 175 100 210 100 H330", "0;0.15;1", "0;0;1"),
    "Qayta tizilishdan oldin ishora bering va yonidagilarga yo'l bering");
  // 134–141: fara chiroqlari (135-band: 150 m)
  const beam = (len, op) => `<path d="M12 -5 L${len} -${len / 6} L${len} ${len / 6} L12 5 Z" fill="#fff59d" opacity="${op}"/>`;
  S.chiroq = () => wrap(hroad(100, 60) +
    mover(`<g>${beam(110, 0.45)}<animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.4;0.4;1" dur="${DUR}s" repeatCount="indefinite"/></g><g opacity="0">${beam(45, 0.55)}<animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.4;0.4;1" dur="${DUR}s" repeatCount="indefinite"/></g>` + carG("#1565c0"), "M-25 115 H325", "0;1", "0;1") +
    mover(`${beam(45, 0.55)}` + carG("#e53935"), "M325 85 H-25", "0;1", "0;1") +
    `<g opacity="0">${label(150, 50, "150 m qoldi — yaqin chiroqqa o'ting", "#fff", 11)}<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.38;0.4;0.65;0.7" dur="${DUR}s" repeatCount="indefinite"/></g>`,
    "Qarshidagi transportga 150 m qolganda yaqinni yorituvchi chiroqqa o'ting", "#0d1b2a");
  // 142–145: shatakka olish
  S.shatak = () => wrap(hroad(100, 60) +
    mover(`${carG("#1565c0")}<line x1="-12" y1="0" x2="-40" y2="0" stroke="#ffb300" stroke-width="2" stroke-dasharray="4 3"/><g transform="translate(-52 0)">${carG("#9e9e9e", hazard())}</g>`, "M-60 116 H360", "0;1", "0;1"),
    "Shatakda: rulda haydovchi, avariya ishorasi yoqilgan, egiluvchan ulagich 4–6 m");
  // 123–127: turar joy dahasi — piyodalar ustun, 20 km/soat
  S.turar = () => wrap(hroad(100, 70, "none") + `<rect x="0" y="40" width="${W}" height="25" fill="${side}"/><rect x="0" y="135" width="${W}" height="25" fill="${side}"/>` +
    mover(person("#6a1b9a"), "M120 150 V50", "0;0.15;0.6;1", "0;0;1;1", "0") + mover(person("#ef6c00"), "M200 60 V150", "0;0.3;0.8;1", "0;0;1;1", "0") +
    mover(carG("#1565c0"), "M-25 112 H325", "0;0.2;0.6;1", "0;0.28;0.42;1"),
    "Turar joy dahasida piyodalar ustun, tezlik 20 km/soatgacha");
  // 128-band: tik qiyalik — nishablikka (pastga) harakatlanayotgan yo'l beradi
  S.tik = () => wrap(`<path d="M0 150 L300 70 V200 H0 Z" fill="#8d6e63"/><path d="M0 150 L300 70" stroke="${asf}" stroke-width="10"/><rect x="150" y="96" width="22" height="14" fill="#ffb300" transform="rotate(-15 161 103)"/>` +
    mover(`<rect x="-10" y="-7" width="20" height="9" rx="3" fill="#1565c0"/>`, "M310 62 L210 88", "0;0.2;0.62;1", "0;0.75;0.75;1", "auto") +
    mover(`<rect x="-10" y="-7" width="20" height="9" rx="3" fill="#e53935"/>`, "M-10 148 L310 62", "0;0.15;0.6;1", "0;0;1;1", "auto") +
    label(240, 60, "pastga") + label(60, 125, "tepaga"),
    "Qiyalikda to'siq bo'lsa, pastga harakatlanayotgan yo'l beradi", "#a5d6a7");

  // band → sahna
  const RANGES = [[13, 14, "avariya"], [15, 22, "piyoda"], [25, 29, "maxsus"], [30, 43, "svetofor"], [44, 47, "qayta"], [48, 52, "avariya"],
    [53, 57, "qayta"], [58, 63, "chapga"], [64, 76, "qayta"], [77, 81, "tezlik"], [82, 87, "quvib"], [88, 95, "toxtash"], [96, 97, "svetofor"],
    [98, 103, "svetofor"], [104, 104, "asosiy"], [105, 106, "ongdan"], [107, 107, "chapga"], [108, 108, "asosiy"], [109, 115, "piyoda"],
    [116, 120, "temiryol"], [123, 127, "turar"], [128, 130, "tik"], [134, 141, "chiroq"], [142, 145, "shatak"]];
  window.RULE_ANIM = (src, topic) => {
    const m = /^(\d+)/.exec(src || ""); let id = null;
    if (m && !/ilova/.test(src)) { const b = +m[1]; for (const [a, z, s] of RANGES) if (b >= a && b <= z) { id = s; break; } }
    if (!id && /aylanma/i.test(topic || "")) id = "aylanma";
    return id && S[id] ? S[id]() : null;
  };
  window.RULE_ANIM_LIST = () => Object.keys(S); window.RULE_ANIM_BY_ID = id => S[id] && S[id]();
})();
