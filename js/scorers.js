/* scorers.js — تابا «⚽ گۆلکەر» (باشترین گۆلکەر). ڤی فایلی دەستکاری نەکە.
   گۆل ژ GOALS (enjam.js) دهێنە خواندن. گۆلێن پێناڵتیان یێن دوماهیا یاریێ ناهێنە هژمارتن. */
(function () {
  "use strict";

  var TOP = 10;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function latin(v) {
    return String(v == null ? "" : v)
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); });
  }

  // ناڤێ یاریزانی بێ جوداهیا پیتێن مەزن/بچووک و ڤالاهیێن زێدە
  function normName(v) {
    return latin(v).replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/‌/g, "")
      .replace(/\s+/g, " ").trim().toLowerCase();
  }

  function toNum(v) {
    var s = latin(v).trim();
    return /^\d+$/.test(s) ? +s : null;
  }

  function parsePair(v) {
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(latin(v));
    return r ? [+r[1], +r[2]] : null;
  }

  function team(id) {
    return (typeof TEAMS !== "undefined" && TEAMS[id]) || { name: "تیم " + id, logo: "" };
  }

  function logo(id) {
    var t = team(id);
    if (t.logo) {
      var img = el("img", "sc-logo");
      img.src = t.logo;
      img.alt = "";
      img.onerror = function () { img.replaceWith(el("span", "sc-logo ph", id)); };
      return img;
    }
    return el("span", "sc-logo ph", id);
  }

  // ⁨…⁩: ناڤێن ئینگلیزی د ناڤ نڤیسینا کوردی دا ڕاست دیار دبن
  function iso(s) { return "⁨" + String(s).trim() + "⁩"; }

  // لیستا گۆلکەران: [{ name, team, goals, games, rank, out }] ب ڕێز، و هشیاری
  function compute() {
    var G = typeof GOALS !== "undefined" && Array.isArray(GOALS) ? GOALS : [];
    var M = window.LEAGUE_MATCHES || [];
    var findTeam = window.LEAGUE_TEAM_ID || function () { return null; };
    var warn = [], seen = {};
    function add(m) { if (!seen[m]) { seen[m] = 1; warn.push(m); } }
    var byNo = {};
    M.forEach(function (m) { byNo[m.no] = m; });

    var players = {}, perTeam = {};
    G.forEach(function (row, i) {
      if (!Array.isArray(row) || row.length < 4) { add("ڕێزا " + (i + 1) + " د GOALS دا نە دروستە"); return; }
      var no = toNum(row[0]), g = toNum(row[3]), name = String(row[1] || "").trim();
      var m = no && byNo[no];
      if (!m) { add("ژمارا یاریێ نە دروستە: «" + row[0] + "» (ڕێزا " + (i + 1) + " د GOALS دا)"); return; }
      if (!name) { add("ناڤێ یاریزانی ڤالایە (ڕێزا " + (i + 1) + " د GOALS دا)"); return; }
      if (g === null || g < 1) { add("ژمارا گۆلان نە دروستە بۆ " + iso(name) + " (ڕێزا " + (i + 1) + " د GOALS دا)"); return; }
      var tid = findTeam(row[2]);
      if (tid === null) { add("ئەڤ ناڤێ تیمێ نەهاتە دیتن: «" + iso(row[2]) + "» (ڕێزا " + (i + 1) + " د GOALS دا)"); return; }
      if (m.home !== tid && m.away !== tid) {
        add(iso(team(tid).name) + " د یاریا " + no + " دا یاری ناکەت (ڕێزا " + (i + 1) + " د GOALS دا)");
        return;
      }
      var key = no + "|" + tid;
      perTeam[key] = (perTeam[key] || 0) + g;
      var pk = normName(name) + "|" + tid;
      var p = players[pk] || (players[pk] = { name: name, team: tid, goals: 0, matches: {} });
      p.goals += g;
      p.matches[no] = 1;
    });

    // گۆلێن تۆمارکری نابیت ژ گۆلێن تیمێ د ئەنجامێ دا پتر بن (پێناڵتی ناهێنە هژمارتن)
    Object.keys(perTeam).forEach(function (key) {
      var parts = key.split("|"), no = +parts[0], tid = +parts[1], m = byNo[no];
      var sc = parsePair(m.result);
      if (!sc) { add("ئەنجاما یاریا " + no + " هێشتا د RESULTS دا نەهاتیە نڤیسین، بەلێ گۆل بۆ وێ هاتینە تۆمارکرن"); return; }
      var real = m.home === tid ? sc[0] : sc[1];
      if (perTeam[key] > real) {
        add("گۆلێن " + iso(team(tid).name) + " د یاریا " + no + " دا " + perTeam[key] + " هاتینە نڤیسین، بەلێ د ئەنجامێ دا " + real + " نە");
      }
    });

    // تیمێن دەرکەفتی
    var out = {};
    M.forEach(function (m) {
      if (!m.winner || !m.home || !m.away) return;
      out[m.winner === m.home ? m.away : m.home] = true;
    });

    var list = Object.keys(players).map(function (k) {
      var p = players[k];
      p.games = Object.keys(p.matches).length;
      p.out = !!out[p.team];
      return p;
    });
    list.sort(function (a, b) {
      return b.goals - a.goals || a.games - b.games || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
    // ڕیزبەندیا هەڤبەش: هەمان ژمارا گۆلان = هەمان پلە (1، 1، 3 ...)
    list.forEach(function (p, i) { p.rank = i && p.goals === list[i - 1].goals ? list[i - 1].rank : i + 1; });
    var top = list.filter(function (p) { return p.rank <= TOP; });
    return { list: top, all: list, warn: warn };
  }

  function rankCell(p) {
    var td = el("td", "sc-rank");
    var medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : "";
    var s = el("span", "sc-rk" + (p.rank <= 3 ? " r" + p.rank : ""), p.rank);
    td.appendChild(s);
    if (medal) td.appendChild(el("span", "sc-medal", medal));
    return td;
  }

  // خشتەیا گۆلکەران (بۆ تابێ و بۆ وێنەی)
  function buildTable(list) {
    var wrap = el("div", "sc-wrap");
    var t = el("table", "scorers");
    var thead = el("thead"), hr = el("tr");
    [["پلە", "sc-rank"], ["یاریزان", "sc-player"], ["تیم", "sc-team"], ["یاری", "sc-games"], ["گۆل", "sc-goals"]].forEach(function (h) {
      hr.appendChild(el("th", h[1], h[0]));
    });
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el("tbody");
    list.forEach(function (p) {
      var tr = el("tr", (p.rank === 1 ? "first " : "") + (p.rank <= 3 ? "medal" : ""));
      tr.appendChild(rankCell(p));
      var pc = el("td", "sc-player");
      var nm = el("span", "sc-name", p.name);
      nm.dir = "auto";
      pc.appendChild(nm);
      if (p.rank === 1) pc.appendChild(el("span", "sc-boot", "👟 گۆلکەرێ ئێکێ"));
      tr.appendChild(pc);
      var tc = el("td", "sc-team");
      var tw = el("div", "sc-tw");
      tw.appendChild(logo(p.team));
      var tn = el("span", "sc-tname", team(p.team).name);
      tn.dir = "auto";
      tw.appendChild(tn);
      if (p.out) tw.appendChild(el("span", "sc-out", "دەرکەفت"));
      tc.appendChild(tw);
      tr.appendChild(tc);
      tr.appendChild(el("td", "sc-games", p.games));
      tr.appendChild(el("td", "sc-goals", p.goals));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  // ناڤونیشان ب خۆ دگوهۆڕیت: هەتا فاینەل نەهاتیە کرن «تا نوکە»، پشتی فاینەلێ ناڤونیشانێ دوماهیێ
  function titleInfo() {
    var M = window.LEAGUE_MATCHES || [];
    var played = M.filter(function (m) { return m.winner; }).length;
    var done = !!window.LEAGUE_CHAMPION;
    return {
      done: done,
      title: done ? "🏆 گۆلکەرێن قارەمانیێ — ئەنجامێن دوماهیێ" : "گۆلکەرێن قارەمانیێ تا نوکە",
      progress: done ? "قارەمانی ب دوماهی هات · " + M.length + " یاری" : "پشتی " + played + " ژ " + M.length + " یاریان"
    };
  }

  function renderScorers() {
    var box = $("scorers");
    if (!box) return;
    var r = compute();
    window.LEAGUE_SCORERS = r;
    var ti = titleInfo();
    $("scTitle").textContent = ti.title;
    $("scProgress").textContent = ti.progress;
    $("scProgress").classList.toggle("done", ti.done);

    var wb = $("scWarn");
    wb.innerHTML = "";
    wb.hidden = !r.warn.length;
    if (r.warn.length) {
      wb.appendChild(el("div", "res-warn-title", "⚠ هشیاری د GOALS دا (enjam.js)"));
      var ul = el("ul");
      r.warn.forEach(function (w) { ul.appendChild(el("li", null, w)); });
      wb.appendChild(ul);
    }

    var holder = $("scTable");
    holder.innerHTML = "";
    $("scEmpty").hidden = r.list.length > 0;
    $("shotScorers").hidden = !r.list.length;
    if (r.list.length) holder.appendChild(buildTable(r.list));

    // کارتا بچووک ل تابا ئەنجامان: گۆلکەرێ ئێکێ
    var card = $("topScorerCard");
    if (card) {
      card.innerHTML = "";
      var firsts = r.list.filter(function (p) { return p.rank === 1; });
      card.hidden = !firsts.length;
      if (firsts.length) {
        var c = el("a", "ts-card");
        c.href = "#scorers";
        c.appendChild(el("span", "ts-label", "👟 گۆلکەرێ ئێکێ"));
        firsts.slice(0, 3).forEach(function (p) {
          var one = el("span", "ts-one");
          one.appendChild(logo(p.team));
          var n = el("b", null, p.name);
          n.dir = "auto";
          one.appendChild(n);
          one.appendChild(el("span", "ts-goals", p.goals + " گۆل"));
          c.appendChild(one);
        });
        card.appendChild(c);
      }
    }
  }

  window.renderScorers = renderScorers;
  window.MITAN_SCORERS = { compute: compute, buildTable: buildTable, titleInfo: titleInfo };
})();
