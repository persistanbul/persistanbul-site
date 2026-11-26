(function () {
  var A = window.OYUN_AYAR, BANK = window.SORULAR, S = window.SCORM;
  var $ = function (id) { return document.getElementById(id); };
  var LETTERS = ["A", "B", "C", "D", "E"];

  // ---------------- oyuncu ----------------
  S.init();
  var learner = S.learner();
  var saved = {};
  try { saved = JSON.parse(S.get("cmi.suspend_data") || "{}") || {}; } catch (e) { saved = {}; }
  if (!S.active) { try { saved = JSON.parse(localStorage.getItem("penalti_me") || "{}") || {}; } catch (e) {} }

  var me = {
    id: learner.id || saved.id || ("misafir-" + Math.random().toString(36).slice(2, 9)),
    name: learner.name || saved.name || "",
    store: saved.store || "",
    best: saved.best || 0
  };
  function persist() {
    var data = JSON.stringify({ id: me.id, name: me.name, store: me.store, best: me.best });
    if (S.active) { S.set("cmi.suspend_data", data); S.commit(); }
    else { try { localStorage.setItem("penalti_me", data); } catch (e) {} }
  }

  // ---------------- giriş ekranı ----------------
  var sel = $("sel-store");
  A.MAGAZALAR.forEach(function (m) { var o = document.createElement("option"); o.value = o.textContent = m; sel.appendChild(o); });
  if (me.name) $("lbl-name").textContent = me.name.split(" ")[0];
  else $("name-row").classList.remove("hidden");
  if (!A.LIG_URL) $("demo-note").classList.remove("hidden");

  // Mağaza kaynağı (öncelik sırasıyla):
  // 1) Paket adresindeki ?magaza=… parametresi  2) Sheets "Personel" sayfası (OyuncuID → Mağaza)
  // 3) Daha önce kaydedilmiş seçim  4) Hiçbiri yoksa listeden seçim
  var fixedStore = "";
  function lockStore(name) {
    fixedStore = me.store = name;
    $("lbl-store").textContent = name;
    $("store-known").classList.remove("hidden");
    $("store-field").classList.add("hidden");
    validate();
  }
  function askStore() {
    if (me.store) sel.value = me.store;
    $("store-field").classList.remove("hidden");
    validate();
  }
  var urlStore = "";
  try { var qp = new URLSearchParams(location.search); urlStore = qp.get("magaza") || qp.get("lokasyon") || ""; } catch (e) {}
  if (urlStore) lockStore(urlStore);
  else if (A.LIG_URL && S.active && learner.id) {
    $("btn-start").disabled = true;
    jsonp(A.LIG_URL + "?action=me&id=" + encodeURIComponent(learner.id), function (d) {
      if (d && d.store) { if (d.name && !learner.name) me.name = d.name; lockStore(d.store); }
      else askStore();
    });
  } else askStore();

  function validate() {
    if (!me.name) me._typed = $("inp-name").value.trim();
    var store = fixedStore || sel.value;
    $("btn-start").disabled = !(store && (me.name || (me._typed || "").length >= 3));
  }
  sel.addEventListener("change", validate);
  $("inp-name").addEventListener("input", validate);
  validate();

  $("btn-start").addEventListener("click", function () {
    me.store = fixedStore || sel.value;
    if (!me.name) me.name = me._typed;
    persist();
    startMatch();
  });
  $("btn-board").addEventListener("click", function () { showEnd(null); });
  $("btn-again").addEventListener("click", startMatch);
  $("btn-home").addEventListener("click", function () { show("scr-start"); });

  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.toggle("active", s.id === id); });
  }

  // ---------------- maç ----------------
  var st;
  var MAX_PER_Q = A.PUAN_DOGRU + A.PUAN_HIZ_MAX + A.PUAN_GOL;

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function startMatch() {
    var idx = BANK.map(function (_, i) { return i; });
    var n = Math.min(A.MAC_SORU_SAYISI, BANK.length);
    st = { qs: shuffle(idx).slice(0, n), i: 0, score: 0, goals: 0, correct: 0, results: [] };
    var dots = $("hud-dots"); dots.innerHTML = "";
    for (var k = 0; k < n; k++) { var d = document.createElement("div"); d.className = "dot"; dots.appendChild(d); }
    updateHud();
    show("scr-game");
    resetShot();
    setTimeout(askQuestion, 300);
  }

  function updateHud() {
    $("hud-score").textContent = st.score;
    $("hud-goals").textContent = st.goals;
    var dots = $("hud-dots").children;
    for (var k = 0; k < dots.length; k++) {
      dots[k].className = "dot" + (st.results[k] ? " d-" + st.results[k] : (k === st.i ? " now" : ""));
    }
  }

  var timerId, tStart;
  function askQuestion() {
    var q = BANK[st.qs[st.i]];
    $("q-no").textContent = "PENALTI " + (st.i + 1) + "/" + st.qs.length;
    $("q-text").textContent = q.s;
    var box = $("q-opts"); box.innerHTML = "";
    // şıkları karıştır, doğruyu takip et
    var order = shuffle(q.c.map(function (_, i) { return i; }));
    order.forEach(function (orig, pos) {
      var b = document.createElement("button");
      b.className = "opt"; b.dataset.orig = orig;
      b.innerHTML = "<b>" + LETTERS[pos] + "</b><span></span>";
      b.querySelector("span").textContent = q.c[orig];
      b.addEventListener("click", function () { answer(orig, b); });
      box.appendChild(b);
    });
    $("qcard").classList.remove("hidden");
    tStart = Date.now();
    tick();
    timerId = setInterval(tick, 250);
  }

  function tick() {
    var left = Math.max(0, A.SORU_SURESI - (Date.now() - tStart) / 1000);
    $("q-timer").textContent = Math.ceil(left);
    var bar = $("q-timer-bar");
    bar.style.setProperty("--w", (left / A.SORU_SURESI * 100) + "%");
    bar.style.setProperty("--tc", left < 5 ? "#ef4444" : "#3d5afe");
    if (left <= 0) answer(-1, null);
  }

  function answer(orig, btn) {
    clearInterval(timerId);
    var q = BANK[st.qs[st.i]];
    var secs = (Date.now() - tStart) / 1000;
    var ok = orig === q.d;
    document.querySelectorAll(".opt").forEach(function (b) {
      b.disabled = true;
      if (+b.dataset.orig === q.d) b.classList.add("correct");
    });
    if (btn && !ok) btn.classList.add("wrong");

    S.interaction("P" + String(st.qs[st.i] + 1).padStart(2, "0"), q.s,
      orig < 0 ? "zaman_doldu" : "secenek_" + (orig + 1), "secenek_" + (q.d + 1), ok, secs);

    if (ok) {
      var speed = Math.round(A.PUAN_HIZ_MAX * Math.max(0, 1 - secs / A.SORU_SURESI));
      st.score += A.PUAN_DOGRU + speed; st.correct++;
      st.lastQ = A.PUAN_DOGRU + speed;
      updateHud();
      setTimeout(function () { $("qcard").classList.add("hidden"); armShot(); }, 700);
    } else {
      st.results[st.i] = "miss";
      setTimeout(function () {
        $("qcard").classList.add("hidden");
        banner("miss", orig < 0 ? "SÜRE BİTTİ" : "OFSAYT!", "Bu penaltı yandı");
        setTimeout(next, 1500);
      }, 1300);
    }
  }

  // ---------------- şut ----------------
  var pitch = $("pitch"), ball = $("ball"), shadow = $("ball-shadow"), skin = ball.querySelector(".ball-skin"), keeper = $("keeper"), aim = $("aim");
  var armed = false, drag = null;

  function resetShot() {
    ball.style.transition = "none";
    ball.style.left = "50%"; ball.style.top = "79%";
    ball.style.transform = "translate(-50%,-50%) scale(1)";
    ball.style.zIndex = 3;
    shadow.style.transition = "none"; shadow.style.left = "50%"; shadow.style.top = "81.2%";
    shadow.style.transform = "translate(-50%,-50%) scale(1)"; shadow.style.opacity = 1;
    skin.classList.remove("spin");
    keeper.style.transform = "translateX(-50%)";
    keeper.className = "keeper";
    $("banner").className = "banner hidden";
  }
  function armShot() {
    resetShot(); armed = true;
    ball.classList.add("ready");
    $("swipe-hint").classList.remove("hidden");
  }

  function rel(e) {
    var r = pitch.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height };
  }
  var BALL = { x: .5, y: .79 };
  var GOAL = { l: .14, r: .86, t: .15, b: .42 };

  pitch.addEventListener("pointerdown", function (e) {
    if (!armed) return;
    var p = rel(e);
    drag = { x0: p.x, y0: p.y, t0: Date.now(), nearBall: Math.hypot((p.x - BALL.x) * p.w, (p.y - BALL.y) * p.h) < p.w * .18 };
    try { pitch.setPointerCapture(e.pointerId); } catch (x) {}
  });
  pitch.addEventListener("pointermove", function (e) {
    if (!drag || !drag.nearBall) return;
    var p = rel(e), dx = (p.x - drag.x0) * p.w, dy = (p.y - drag.y0) * p.h;
    var len = Math.hypot(dx, dy);
    if (len < 10 || dy > 0) { aim.classList.add("hidden"); return; }
    aim.classList.remove("hidden");
    aim.style.left = (BALL.x * 100) + "%"; aim.style.top = (BALL.y * 100) + "%";
    aim.style.width = Math.min(len * 1.6, p.h * .5) + "px";
    aim.style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
  });
  pitch.addEventListener("pointerup", function (e) {
    if (!armed || !drag) return;
    var p = rel(e), d = drag; drag = null; aim.classList.add("hidden");
    var dx = (p.x - d.x0) * p.w, dy = (p.y - d.y0) * p.h, len = Math.hypot(dx, dy);
    var tx, ty;
    if (d.nearBall && len > 25 && dy < -10) {
      // kaydırma: yönü kale çizgisine yansıt, kaydırma uzunluğu yüksekliği belirler
      var lineY = GOAL.b;
      var tLine = ((BALL.y - lineY) * p.h) / -dy;
      tx = BALL.x + (dx * tLine) / p.w;
      var power = Math.min(1.25, len / (p.h * .38));          // 0..1.25
      ty = GOAL.b - (GOAL.b - GOAL.t) * power;                // uzun kaydırma = yüksek şut
      ty += (Math.random() - .5) * .02; tx += (Math.random() - .5) * .02;
    } else if (!d.nearBall && len < 15 && p.y < GOAL.b + .03) {
      // dokunma/tıklama: kalede dokunulan noktaya vur
      tx = p.x; ty = Math.max(p.y, GOAL.t - .05);
    } else return;
    shoot(tx, ty);
  });

  function shoot(tx, ty) {
    armed = false;
    ball.classList.remove("ready");
    $("swipe-hint").classList.add("hidden");

    var gw = GOAL.r - GOAL.l, gh = GOAL.b - GOAL.t;
    var nx = (tx - GOAL.l) / gw;            // 0..1 kale içinde yatay
    var ny = (GOAL.b - ty) / gh;            // 0 = yer, 1 = üst direk
    var inside = nx > 0.02 && nx < 0.98 && ny < 0.97;
    var post = !inside && (nx > -0.04 && nx < 1.04) && ny < 1.04;

    // kaleci kararı
    var zone = nx < 1 / 3 ? 0 : nx < 2 / 3 ? 1 : 2;
    var dive = Math.random() < A.KALECI_ZORLUK ? zone : Math.floor(Math.random() * 3);
    var kx = [-115, 0, 115][dive], rot = [-70, 0, 70][dive], ky = dive === 1 ? -18 : -8;
    // kurtarış: doğru tarafa atladıysa ve top uzanabileceği yerdeyse
    var reach = dive === 1 ? (Math.abs(nx - .5) < .2 && ny < .8) : (Math.abs(nx - [.12, .5, .88][dive]) < .2 && ny < .78);
    var result = !inside ? "miss" : reach ? "saved" : "goal";

    // animasyon
    var endY = result === "saved" ? ty + .02 : ty;
    ball.style.transition = "left .45s cubic-bezier(.25,.6,.3,1), top .45s cubic-bezier(.25,.6,.3,1), transform .45s ease-out";
    ball.style.zIndex = result === "goal" ? 1 : 4;
    requestAnimationFrame(function () {
      ball.style.left = (tx * 100) + "%";
      ball.style.top = (endY * 100) + "%";
      ball.style.transform = "translate(-50%,-50%) scale(.5)";
      skin.classList.add("spin");
      // gölge yerde kalır: topun yere izdüşümü kale çizgisine doğru gider, yükseldikçe solar
      var lift = Math.max(0, Math.min(1, (GOAL.b - endY) / (GOAL.b - GOAL.t)));
      shadow.style.transition = "left .45s cubic-bezier(.25,.6,.3,1), top .45s cubic-bezier(.25,.6,.3,1), transform .45s, opacity .45s";
      shadow.style.left = (tx * 100) + "%";
      shadow.style.top = (Math.min(GOAL.b + .005, endY + .02) * 100) + "%";
      shadow.style.transform = "translate(-50%,-50%) scale(" + (0.5 + 0.3 * lift) + ")";
      shadow.style.opacity = String(0.85 - 0.6 * lift);
      setTimeout(function () {
        keeper.className = "keeper diving" + (dive === 1 ? " center" : "");
        keeper.style.transform = "translateX(calc(-50% + " + kx + "%)) translateY(" + ky + "%) rotate(" + rot + "deg)";
      }, 60);
    });

    setTimeout(function () {
      st.results[st.i] = result;
      if (result === "goal") {
        st.score += A.PUAN_GOL; st.goals++;
        document.querySelector(".net").classList.add("shake");
        setTimeout(function () { document.querySelector(".net").classList.remove("shake"); }, 500);
        if (window.Crowd) Crowd.cheer();
        banner("goal", "GOOOL!", "+" + (st.lastQ + A.PUAN_GOL) + " puan");
      } else if (result === "saved") {
        ball.style.transition = "left .5s ease-out, top .5s ease-out";
        ball.style.left = (tx < .5 ? tx - .12 : tx + .12) * 100 + "%"; ball.style.top = "52%";
        shadow.style.transition = ball.style.transition;
        shadow.style.left = ball.style.left; shadow.style.top = "53.5%"; shadow.style.opacity = ".8";
        if (window.Crowd) Crowd.gasp();
        banner("saved", "KURTARDI!", "+" + st.lastQ + " puan (doğru cevap)");
      } else {
        banner("miss", post ? "DİREK!" : "AUT!", "+" + st.lastQ + " puan (doğru cevap)");
      }
      updateHud();
      setTimeout(next, 1700);
    }, 520);
  }

  function banner(kind, big, small) {
    var b = $("banner");
    b.className = "banner " + kind;
    b.innerHTML = big + "<small></small>";
    b.querySelector("small").textContent = small;
    requestAnimationFrame(function () { b.classList.add("show"); });
  }

  function next() {
    st.i++;
    resetShot(); updateHud();
    if (st.i >= st.qs.length) return finishMatch();
    setTimeout(askQuestion, 250);
  }

  // ---------------- maç sonu ----------------
  function finishMatch() {
    var max = st.qs.length * MAX_PER_Q;
    S.finish(st.score, max, A.GECME_YUZDE);
    var isBest = st.score > me.best;
    if (isBest) me.best = st.score;
    persist();
    submit({ score: st.score, goals: st.goals, correct: st.correct, total: st.qs.length });
    showEnd({ isBest: isBest });
  }

  function showEnd(info) {
    $("end-head").classList.toggle("hidden", !info);
    if (info) {
      $("end-score").textContent = st.score;
      $("end-correct").textContent = st.correct + "/" + st.qs.length;
      $("end-goals").textContent = st.goals;
      $("end-best").textContent = me.best;
      var pct = st.correct / st.qs.length;
      $("end-msg").textContent = info.isBest ? "Yeni rekorun! " + (me.store || "Mağazan") + " için puan hanene yazıldı."
        : pct >= .8 ? "Harika maç! Rekorunu geçmek için bir rövanş?"
        : pct >= .5 ? "İyi maç. Rövanşta daha fazla gol çıkar!"
        : "Isınma turuydu. Rövanşta gol yağmuru bekliyoruz!";
    }
    $("btn-again").textContent = info ? "RÖVANŞ" : "MAÇA BAŞLA";
    $("btn-again").disabled = !me.store;
    $("board-season").textContent = "Sezon: " + A.SEZON;
    show("scr-end");
    loadBoard();
  }

  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      $("board-players").classList.toggle("hidden", t.dataset.tab !== "players");
      $("board-stores").classList.toggle("hidden", t.dataset.tab !== "stores");
    });
  });

  // ---------------- lig (Google Sheets / demo) ----------------
  function payload(r) {
    return { token: A.TOKEN, season: A.SEZON, id: me.id, name: me.name, store: me.store,
      score: r.score, goals: r.goals, correct: r.correct, total: r.total };
  }
  var pendingSubmit = null;
  function submit(r) {
    var data = payload(r);
    if (!A.LIG_URL) return demoSave(data);
    pendingSubmit = fetch(A.LIG_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) })
      .catch(function () {});
  }

  function loadBoard() {
    $("board-players").innerHTML = $("board-stores").innerHTML = '<div class="empty">Yükleniyor…</div>';
    if (!A.LIG_URL) return render(demoBoard());
    (pendingSubmit || Promise.resolve()).then(function () {
      jsonp(A.LIG_URL + "?action=board&season=" + encodeURIComponent(A.SEZON) + "&id=" + encodeURIComponent(me.id), function (data) {
        if (!data || data.error) { $("board-players").innerHTML = $("board-stores").innerHTML = '<div class="empty">Lig tablosuna şu an ulaşılamıyor.</div>'; return; }
        render(data);
      });
    });
  }

  function jsonp(url, cb) {
    var name = "cbPen" + Date.now() + Math.floor(Math.random() * 1000), done = false;
    var s = document.createElement("script");
    window[name] = function (d) { done = true; cb(d); cleanup(); };
    function cleanup() { try { delete window[name]; } catch (e) { window[name] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
    s.onerror = function () { if (!done) { done = true; cb(null); cleanup(); } };
    setTimeout(function () { if (!done) { done = true; cb(null); cleanup(); } }, 12000);
    s.src = url + "&callback=" + name + "&_=" + Date.now();
    document.body.appendChild(s);
  }

  function render(data) {
    var pl = $("board-players"), sl = $("board-stores");
    pl.innerHTML = sl.innerHTML = "";
    if (!data.players.length) pl.innerHTML = '<div class="empty">Henüz maç oynanmadı. İlk golü sen at!</div>';
    data.players.forEach(function (p, i) {
      row(pl, i + 1, p.name, p.store + " · " + p.goals + " gol", p.score, p.id === me.id);
    });
    if (!data.stores.length) sl.innerHTML = '<div class="empty">Henüz mağaza puanı yok.</div>';
    data.stores.forEach(function (m, i) {
      row(sl, i + 1, m.store, m.players + " oyuncu · ort. " + m.avg, m.total, m.store === me.store);
    });
    if (data.me && data.me.rank > data.players.length) {
      row(pl, data.me.rank, me.name + " (sen)", me.store, data.me.score, true);
    }
  }
  function row(box, rk, name, sub, pts, mine) {
    var r = document.createElement("div"); r.className = "row" + (mine ? " me" : "");
    r.innerHTML = '<span class="rk"></span><span class="nm"><span class="sub"></span></span><span class="pt"></span>';
    r.querySelector(".rk").textContent = rk;
    r.querySelector(".nm").insertBefore(document.createTextNode(name), r.querySelector(".sub"));
    r.querySelector(".sub").textContent = sub;
    r.querySelector(".pt").textContent = pts;
    box.appendChild(r);
  }

  // demo modu: cihazda tutulan lig
  function demoLoad() { try { return JSON.parse(localStorage.getItem("penalti_demo_" + A.SEZON) || "{}"); } catch (e) { return {}; } }
  function demoSave(d) {
    var all = demoLoad(), prev = all[d.id];
    if (!prev || d.score > prev.score) all[d.id] = { id: d.id, name: d.name, store: d.store, score: d.score, goals: d.goals };
    else { prev.store = d.store; prev.name = d.name; }
    try { localStorage.setItem("penalti_demo_" + A.SEZON, JSON.stringify(all)); } catch (e) {}
  }
  var DEMO_SEED = [
    { id: "d1", name: "Deniz K.", store: "Kadıköy Mağaza", score: 1180, goals: 4 },
    { id: "d2", name: "Ece T.", store: "Nişantaşı Mağaza", score: 1040, goals: 4 },
    { id: "d3", name: "Mert A.", store: "Ankara Mağaza", score: 960, goals: 3 },
    { id: "d4", name: "Selin Y.", store: "Kadıköy Mağaza", score: 870, goals: 3 },
    { id: "d5", name: "Can B.", store: "İzmir Mağaza", score: 720, goals: 2 },
    { id: "d6", name: "Zeynep Ö.", store: "Merkez Ofis", score: 610, goals: 2 }
  ];
  function demoBoard() {
    var saved = demoLoad();
    var list = DEMO_SEED.concat(Object.keys(saved).map(function (k) { return saved[k]; }));
    return aggregate(list);
  }
  function aggregate(list) {
    list.sort(function (a, b) { return b.score - a.score; });
    var stores = {};
    list.forEach(function (p) { var s = stores[p.store] || (stores[p.store] = { store: p.store, total: 0, players: 0 }); s.total += p.score; s.players++; });
    var sl = Object.keys(stores).map(function (k) { var s = stores[k]; s.avg = Math.round(s.total / s.players); return s; })
      .sort(function (a, b) { return b.total - a.total; });
    var rank = list.findIndex(function (p) { return p.id === me.id; });
    return { players: list.slice(0, 20), stores: sl, me: rank > -1 ? { rank: rank + 1, score: list[rank].score } : null };
  }
})();
