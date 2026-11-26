// Kaleye arkadan bakan tribün: katlı oturma sıraları, farklı ten/saç/forma renkleriyle taraftarlar,
// zaman zaman Meksika dalgası; golde ayağa kalkıp kollarını kaldırıyorlar.
(function () {
  var cv = document.getElementById("crowd");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, people = [], rows = [];
  var excite = 0, gasp = 0, waveX = -1, nextWave = 4000, t0 = performance.now();

  var SKIN = ["#f3d0b0", "#e8b98f", "#d6a074", "#b87a4b", "#8d5a36", "#5e3a22", "#f0c8a8"];
  var HAIR = ["#1c130d", "#2b1d14", "#4a3020", "#7a5230", "#b08850", "#d9c08a", "#111", "#888"];
  // ağırlıklı forma renkleri: ev sahibi (yeşil-lacivert) baskın, arada karışık
  var SHIRT = ["#c6ff3d", "#c6ff3d", "#a6dd2a", "#1d2a6b", "#1d2a6b", "#24348a", "#ffffff", "#e8e8e8",
               "#d23a3a", "#2d6cdf", "#222", "#f2b233", "#6b3fa0", "#3a3a3a"];
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function build() {
    var r = cv.getBoundingClientRect();
    if (!r.width) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    people = []; rows = [];
    var nRows = 9, y = H * 0.16, base = H * 0.072;
    for (var i = 0; i < nRows; i++) {
      var rh = base * (0.78 + i * 0.05);           // alt sıralar (yakın) daha büyük
      rows.push({ y: y, h: rh });
      var gap = rh * 0.62, x = (i % 2 ? gap / 2 : 0) - gap / 2;
      while (x < W + gap) {
        x += gap * (0.92 + Math.random() * 0.16);
        if (Math.random() < 0.06) continue;        // boş koltuk
        people.push({
          x: x, row: i, s: rh,
          skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT),
          bald: Math.random() < 0.1, cap: Math.random() < 0.08 ? pick(["#c6ff3d", "#1d2a6b", "#222", "#d23a3a"]) : null,
          scarf: Math.random() < 0.18 ? pick(["#c6ff3d", "#1d2a6b"]) : null,
          phase: Math.random() * 6.28, spd: 1.5 + Math.random() * 2.5,
          fan: Math.random() < 0.55, lean: (Math.random() - .5) * 0.12
        });
      }
      y += rh;
    }
    return true;
  }

  function seatRow(r, i) {
    // beton basamak + koltuk sırası
    var g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, i % 2 ? "#2a3350" : "#2e3858");
    g.addColorStop(1, "#1a2036");
    ctx.fillStyle = g; ctx.fillRect(0, r.y, W, r.h);
    ctx.fillStyle = "rgba(255,255,255,.06)"; ctx.fillRect(0, r.y, W, 1);
    // koltuk sırtları
    ctx.fillStyle = i % 3 === 0 ? "#2b4bb3" : "#24409a";
    ctx.fillRect(0, r.y + r.h * 0.62, W, r.h * 0.18);
  }

  function person(p, t) {
    var r = rows[p.row], s = p.s;
    var dist = Math.abs(p.x / W - waveX);
    var inWave = waveX >= 0 && dist < 0.07;
    var wave = inWave ? Math.cos(dist / 0.07 * Math.PI / 2) : 0;
    var hype = Math.max(excite * (p.fan ? 1 : 0.6), wave);
    var bob = Math.sin(t * p.spd + p.phase) * s * 0.03 + Math.max(0, Math.sin(t * p.spd * 3.2 + p.phase)) * s * 0.22 * excite;
    var stand = hype * s * 0.32;
    var cx = p.x, by = r.y + r.h * 0.78 - bob - stand;     // gövde altı
    var tw = s * 0.42, th = s * 0.48;
    var hx = cx + p.lean * s, hy = by - th - s * 0.15;
    var armsUp = hype > 0.45;

    // kollar (arkada)
    ctx.lineCap = "round"; ctx.lineWidth = s * 0.1;
    if (armsUp) {
      var sw = Math.sin(t * 7 + p.phase) * s * 0.08;
      ctx.strokeStyle = p.shirt;
      ctx.beginPath();
      ctx.moveTo(cx - tw * 0.42, by - th * 0.85); ctx.lineTo(cx - tw * 0.6 + sw, hy - s * 0.34);
      ctx.moveTo(cx + tw * 0.42, by - th * 0.85); ctx.lineTo(cx + tw * 0.6 + sw, hy - s * 0.34);
      ctx.stroke();
      ctx.fillStyle = p.skin;
      ctx.beginPath(); ctx.arc(cx - tw * 0.6 + sw, hy - s * 0.36, s * 0.055, 0, 6.28); ctx.arc(cx + tw * 0.6 + sw, hy - s * 0.36, s * 0.055, 0, 6.28); ctx.fill();
      if (p.scarf) {   // atkıyı iki elle havada tut
        ctx.fillStyle = p.scarf;
        ctx.fillRect(cx - tw * 0.6 + sw, hy - s * 0.42, tw * 1.2, s * 0.1);
        ctx.fillStyle = p.scarf === "#c6ff3d" ? "#1d2a6b" : "#c6ff3d";
        ctx.fillRect(cx - tw * 0.6 + sw, hy - s * 0.39, tw * 1.2, s * 0.03);
      }
    }
    // gövde (omuzlar yuvarlak)
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, by);
    ctx.lineTo(cx - tw / 2, by - th * 0.7);
    ctx.quadraticCurveTo(cx - tw / 2, by - th, cx - tw * 0.2, by - th);
    ctx.lineTo(cx + tw * 0.2, by - th);
    ctx.quadraticCurveTo(cx + tw / 2, by - th, cx + tw / 2, by - th * 0.7);
    ctx.lineTo(cx + tw / 2, by);
    ctx.fill();
    // gölge tarafı
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(cx + tw * 0.12, by - th * 0.8, tw * 0.38, th * 0.8);
    if (p.scarf && !armsUp) { ctx.fillStyle = p.scarf; ctx.fillRect(cx - tw * 0.3, by - th * 0.98, tw * 0.6, th * 0.16); }
    // boyun + baş
    ctx.fillStyle = p.skin;
    ctx.fillRect(hx - s * 0.04, hy + s * 0.08, s * 0.08, s * 0.1);
    ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.13, s * 0.15, 0, 0, 6.28); ctx.fill();
    // saç / şapka
    if (p.cap) {
      ctx.fillStyle = p.cap;
      ctx.beginPath(); ctx.ellipse(hx, hy - s * 0.05, s * 0.14, s * 0.11, 0, Math.PI, 0); ctx.fill();
      ctx.fillRect(hx - s * 0.02, hy - s * 0.07, s * 0.2, s * 0.035);
    } else if (!p.bald) {
      ctx.fillStyle = p.hair;
      ctx.beginPath(); ctx.ellipse(hx, hy - s * 0.04, s * 0.14, s * 0.12, 0, Math.PI * 1.02, -0.02); ctx.fill();
    }
    // yüz detayı: yalnızca yakın sıralarda
    if (s > 9) {
      ctx.fillStyle = "rgba(0,0,0,.55)";
      ctx.fillRect(hx - s * 0.06, hy, s * 0.03, s * 0.025);
      ctx.fillRect(hx + s * 0.03, hy, s * 0.03, s * 0.025);
      if (excite > 0.5 || gasp > 0.5) { ctx.beginPath(); ctx.ellipse(hx, hy + s * 0.07, s * 0.03, s * 0.035, 0, 0, 6.28); ctx.fill(); }
    }
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    // çatı gölgesi ve stadyum içi
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#05070f"); bg.addColorStop(0.18, "#121830"); bg.addColorStop(1, "#1a2036");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // çatı kirişi ve projektör ışıkları
    ctx.fillStyle = "#0a0d1a"; ctx.fillRect(0, 0, W, H * 0.07);
    for (var k = 0; k < 7; k++) {
      var lx = W * (0.08 + k * 0.14);
      var lg = ctx.createRadialGradient(lx, H * 0.05, 0, lx, H * 0.05, H * 0.22);
      lg.addColorStop(0, "rgba(255,255,240,.55)"); lg.addColorStop(0.15, "rgba(220,230,255,.18)"); lg.addColorStop(1, "rgba(200,210,255,0)");
      ctx.fillStyle = lg; ctx.fillRect(lx - H * 0.22, 0, H * 0.44, H * 0.3);
      ctx.fillStyle = "#fffbe6"; ctx.fillRect(lx - 3, H * 0.045, 6, 2);
    }
    // sıralar arkadan öne (uzaktaki önce)
    var pi = 0;
    for (var i = 0; i < rows.length; i++) {
      seatRow(rows[i], i);
      while (pi < people.length && people[pi].row === i) { person(people[pi], t); pi++; }
    }
    // atmosfer: uzak sıraları hafif puslu yap
    var haze = ctx.createLinearGradient(0, 0, 0, H);
    haze.addColorStop(0, "rgba(120,140,200,.22)"); haze.addColorStop(0.6, "rgba(120,140,200,.05)"); haze.addColorStop(1, "rgba(0,0,0,.15)");
    ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    // flaşlar (golde)
    if (excite > 0.3) for (var f = 0; f < 3; f++) if (Math.random() < excite * 0.35) {
      var fx = Math.random() * W, fy = H * (0.25 + Math.random() * 0.6);
      var fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 6);
      fg.addColorStop(0, "rgba(255,255,255,.95)"); fg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = fg; ctx.fillRect(fx - 6, fy - 6, 12, 12);
    }
  }

  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (document.hidden || !cv.offsetParent) return;
    if (now - last < 40) return;                       // ~25 fps yeter
    var dt = Math.min(0.2, (now - last) / 1000); last = now;
    if (!W || Math.abs(cv.getBoundingClientRect().width - W) > 1) { if (!build()) return; }
    excite = Math.max(0, excite - dt * 0.35);
    gasp = Math.max(0, gasp - dt * 0.6);
    nextWave -= dt * 1000;
    if (waveX < 0 && nextWave <= 0 && excite < 0.1) waveX = 0;
    if (waveX >= 0) { waveX += dt * 0.32; if (waveX > 1.1) { waveX = -1; nextWave = 9000 + Math.random() * 9000; } }
    draw(now);
  }
  requestAnimationFrame(loop);
  window.addEventListener("resize", function () { W = 0; });

  window.Crowd = {
    cheer: function () { excite = 1; waveX = -1; },
    gasp: function () { gasp = 1; }
  };
})();
