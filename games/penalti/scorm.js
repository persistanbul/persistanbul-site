// SCORM 2004 sarmalayıcı — LMS yoksa sessizce "önizleme" modunda çalışır.
(function () {
  function findAPI(win) {
    var tries = 0;
    while (win && tries < 12) {
      try { if (win.API_1484_11) return win.API_1484_11; } catch (e) {}
      if (win.parent && win.parent !== win) { win = win.parent; tries++; } else break;
    }
    return null;
  }
  var api = findAPI(window);
  if (!api && window.opener) api = findAPI(window.opener);

  var started = false, finished = false, interactionCount = 0;

  var S = {
    active: false,
    init: function () {
      if (!api) return false;
      var r = api.Initialize("");
      started = (r === "true" || r === true);
      S.active = started;
      if (started) {
        var n = parseInt(api.GetValue("cmi.interactions._count"), 10);
        interactionCount = isNaN(n) ? 0 : n;
        if (api.GetValue("cmi.completion_status") !== "completed") S.set("cmi.completion_status", "incomplete");
      }
      return started;
    },
    get: function (k) { if (!started) return ""; try { return api.GetValue(k) || ""; } catch (e) { return ""; } },
    set: function (k, v) { if (!started) return; try { api.SetValue(k, String(v)); } catch (e) {} },
    commit: function () { if (started) try { api.Commit(""); } catch (e) {} },
    learner: function () {
      var name = S.get("cmi.learner_name"), id = S.get("cmi.learner_id");
      // Enocta/LMS'ler adı çoğu zaman "Soyad, Ad" verir → "Ad Soyad"
      if (name.indexOf(",") > -1) { var p = name.split(","); name = (p[1] || "").trim() + " " + (p[0] || "").trim(); }
      return { name: name.trim(), id: id.trim() };
    },
    interaction: function (qid, desc, response, correct, isCorrect, latencySec) {
      if (!started) return;
      var i = "cmi.interactions." + interactionCount + ".";
      S.set(i + "id", qid);
      S.set(i + "type", "choice");
      S.set(i + "description", desc.substring(0, 250));
      S.set(i + "correct_responses.0.pattern", correct);
      S.set(i + "learner_response", response);
      S.set(i + "result", isCorrect ? "correct" : "incorrect");
      S.set(i + "latency", "PT" + Math.max(0, Math.round(latencySec)) + "S");
      S.set(i + "timestamp", new Date().toISOString().substring(0, 19));
      interactionCount++;
    },
    finish: function (score, max, passPct) {
      if (!started) return;
      var scaled = max ? Math.min(1, score / max) : 0;
      S.set("cmi.score.min", 0);
      S.set("cmi.score.max", max);
      S.set("cmi.score.raw", score);
      S.set("cmi.score.scaled", scaled.toFixed(4));
      S.set("cmi.completion_status", "completed");
      S.set("cmi.success_status", scaled * 100 >= passPct ? "passed" : "failed");
      S.commit();
    },
    terminate: function () {
      if (!started || finished) return;
      finished = true;
      S.set("cmi.exit", "suspend");
      S.commit();
      try { api.Terminate(""); } catch (e) {}
    }
  };
  window.addEventListener("pagehide", S.terminate);
  window.addEventListener("beforeunload", S.terminate);
  window.SCORM = S;
})();
