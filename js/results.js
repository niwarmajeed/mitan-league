/* results.js — بەشێ ئەنجامان. ڤی فایلی دەستکاری نەکە.
   ئەنجام ژ RESULTS (enjam.js) دهێنە خواندن؛ app.js یاریان ئامادە دکەت (LEAGUE_MATCHES). */
(function () {
  "use strict";

  var DAYS = ["یەکشەمب", "دووشەمب", "سێشەمب", "چارشەمب", "پێنجشەمب", "ئەینی", "شەمبی"];

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function parseDate(s) {
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // "2 - 1" → [2, 1]؛ ژمارێن عەرەبی (٢ - ١) ژی قبوول دکەت
  function parseScore(s) {
    var t = String(s || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(t);
    return r ? [+r[1], +r[2]] : null;
  }

  function team(id) {
    return (typeof TEAMS !== "undefined" && TEAMS[id]) ||
           { name: typeof id === "string" ? id : (id ? "تیم " + id : "؟"), logo: "" };
  }

  function logo(id, cls) {
    var t = team(id);
    if (t.logo) {
      var img = el("img", cls);
      img.src = t.logo;
      img.alt = t.name;
      img.onerror = function () { img.replaceWith(el("div", cls + " ph", id || "؟")); };
      return img;
    }
    return el("div", cls + " ph", id || "؟");
  }

  // ئەنجاما یاریەکێ: گۆل، پێناڵتی و سەرکەفتی
  function outcome(m) {
    var g = parseScore(m.result);
    if (!g) return null;
    var p = g[0] === g[1] ? parseScore(m.pens) : null;
    var win = null;
    if (g[0] !== g[1]) win = g[0] > g[1] ? "home" : "away";
    else if (p && p[0] !== p[1]) win = p[0] > p[1] ? "home" : "away";
    return { h: g[0], a: g[1], pens: p, win: win };
  }

  // سکۆر ب ڕێزا ڕاست: ژمارا تیمێ ئێکێ ل نک تیمێ ئێکێ
  function scoreRow(cls, a, b) {
    var box = el("div", cls);
    box.appendChild(el("span", null, a));
    box.appendChild(el("span", "dash", "-"));
    box.appendChild(el("span", null, b));
    return box;
  }

  function teamSide(id, state) {
    var box = el("div", "res-team " + state);
    box.appendChild(logo(id, "res-logo"));
    var nm = el("div", "res-name", team(id).name);
    nm.dir = "auto";
    box.appendChild(nm);
    // قارەمانیا دەرکەفتنێ: سەرکەفتی و دەرکەفتی (یاریا وەکهەڤ ب پێناڵتیان بڕیار دهێتە دان)
    if (state === "win") box.appendChild(el("span", "res-badge win", "سەرکەفتن"));
    else if (state === "lose") box.appendChild(el("span", "res-badge lose", "❌ دەرکەفت"));
    return box;
  }

  function renderResults() {
    if (!$("results")) return;
    // یاری دگەل ئەنجامێن enjam.js (app.js ئامادە دکەت)
    var M = window.LEAGUE_MATCHES || [];
    var UI = window.LEAGUE_UI;
    if (UI) UI.champBanner("champResults");

    // هشیاری: ناڤێن خەلەت یان یاریێن نەهاتینە دیتن
    var warn = window.LEAGUE_WARNINGS || [];
    var wb = $("resWarn");
    wb.innerHTML = "";
    wb.hidden = !warn.length;
    if (warn.length) {
      wb.appendChild(el("div", "res-warn-title", "⚠ هشیاری د enjam.js دا"));
      var ul = el("ul");
      warn.forEach(function (w) { ul.appendChild(el("li", null, w)); });
      wb.appendChild(ul);
    }

    // ژمارا ڕۆژێ وەکی خشتەیێ یاریان (ڕۆژا 1، ڕۆژا 2 ...)
    var dates = [];
    M.forEach(function (m) { if (m.date && dates.indexOf(m.date) < 0) dates.push(m.date); });
    dates.sort();

    var played = [];
    M.forEach(function (m) {
      var o = m.home && m.away ? outcome(m) : null;
      if (o) played.push({ m: m, o: o, i: m.no });
    });

    // کورتی
    var goals = played.reduce(function (s, x) { return s + x.o.h + x.o.a; }, 0);
    $("resPlayed").textContent = played.length;
    $("resGoals").textContent = goals;
    $("resAvg").textContent = played.length ? (Math.round(goals / played.length * 10) / 10) : 0;

    // ئەنجامێن یاریان: یێن نووترین ل سەری، کۆمکری ل دویف ڕۆژێ
    var list = $("resList");
    list.innerHTML = "";
    $("resEmpty").hidden = played.length > 0;
    // یاریا بێ ڕێکەفت (فاینەل) ل سەری، وەکی یا نووترین
    var shown = played.slice();
    shown.sort(function (a, b) {
      if (!a.m.date !== !b.m.date) return a.m.date ? 1 : -1;
      var tk = window.LEAGUE_TIME_KEY;
      return a.m.date === b.m.date ? ((tk ? tk(b.m.time) - tk(a.m.time) : 0) || b.i - a.i) : (a.m.date < b.m.date ? 1 : -1);
    });

    var groups = [];
    shown.forEach(function (x) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== x.m.date) { g = { date: x.m.date, items: [] }; groups.push(g); }
      g.items.push(x);
    });

    groups.forEach(function (g) {
      var sec = el("section", "day");
      var head = el("div", "day-head");
      if (g.date) {
        var d = parseDate(g.date);
        head.appendChild(el("span", "day-num", "ڕۆژا " + (dates.indexOf(g.date) + 1)));
        head.appendChild(el("span", "day-date", pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear()));
        head.appendChild(el("span", "day-name", DAYS[d.getDay()]));
      } else {
        head.appendChild(el("span", "day-num final-num", "🏆 فاینەل"));
      }
      if (window.MITAN_SHARE) head.appendChild(window.MITAN_SHARE.dayButton(head, sec, "encam"));
      sec.appendChild(head);

      g.items.forEach(function (x) {
        var m = x.m, o = x.o;
        var hs = o.win ? (o.win === "home" ? "win" : "lose") : "draw";
        var as = o.win ? (o.win === "away" ? "win" : "lose") : "draw";
        var card = el("article", "res-card" + (m.final ? " final" : ""));
        card.appendChild(el("span", "round", m.final ? "🏆 فاینەل" : m.round));
        card.appendChild(el("span", "match-no", "یاریا " + m.no));
        card.appendChild(teamSide(m.home, hs));
        var c = el("div", "res-center");
        c.appendChild(scoreRow("res-score", o.h, o.a));
        if (o.pens) {
          var pr = el("div", "res-pens");
          pr.appendChild(el("span", null, "پێناڵتی"));
          pr.appendChild(scoreRow("res-pens-score", o.pens[0], o.pens[1]));
          c.appendChild(pr);
        }
        if (m.time) c.appendChild(el("div", "time", m.time));
        c.appendChild(el("div", "done-badge", "✓ یاری ب دوماهی هات"));
        card.appendChild(c);
        card.appendChild(teamSide(m.away, as));
        sec.appendChild(card);
      });
      list.appendChild(sec);
    });

    // خشتەیا تیمان — یاسایێن دەرکەفتنێ (Knockout):
    // سەرکەفتی (ب گۆلان یان پێناڵتیان) 3 خال؛ دۆڕاندی 0 خال و ژ قارەمانیێ دەردکەڤیت.
    // گۆل تنێ ژ ئەنجاما یاریێ دهێنە هژمارتن، نە ژ پێناڵتیان.
    var ROUNDS = window.LEAGUE_ROUNDS || [], RO = window.LEAGUE_ROUND_OF || [];
    var FINAL = (window.LEAGUE_PATH || []).length;
    var ids = typeof TEAMS !== "undefined" ? Object.keys(TEAMS).map(Number) : [];
    var row = {};
    ids.forEach(function (id) { row[id] = { id: id, p: 0, w: 0, l: 0, gf: 0, ga: 0, outRound: -1, outNo: 0 }; });
    played.forEach(function (x) {
      var m = x.m, o = x.o;
      [[m.home, o.h, o.a, "home"], [m.away, o.a, o.h, "away"]].forEach(function (s) {
        var r = row[s[0]];
        if (!r) return;
        r.p++; r.gf += s[1]; r.ga += s[2];
        if (!o.win) return;  // وەکهەڤ بێ پێناڵتی: هێشتا سەرکەفتی نینە
        if (o.win === s[3]) r.w++;
        else { r.l++; r.outRound = RO[m.no - 1] || 0; r.outNo = m.no; }
      });
    });
    var champ = window.LEAGUE_CHAMPION || null;
    var rows = ids.map(function (id) {
      var r = row[id];
      r.gd = r.gf - r.ga;
      r.pts = r.w * 3;
      if (champ && id === champ) r.status = "champ";
      else if (r.l && r.outNo === FINAL) r.status = "second";
      else if (r.l) r.status = "out";
      else if (!r.p) r.status = "idle";
      else r.status = "in";
      // قوناغا نوکە: یاریا وێ یا دویڤدا (هێشتا نەهاتیە کرن)
      if (r.status === "in" || r.status === "idle") {
        for (var i = 0; i < M.length; i++) {
          var m = M[i];
          if (!m.winner && (m.home === id || m.away === id)) { r.round = ROUNDS[RO[m.no - 1]] || ""; break; }
        }
      }
      return r;
    });
    var GROUP = { champ: 0, second: 1, "in": 1, idle: 2, out: 3 };
    rows.sort(function (a, b) {
      var ga = GROUP[a.status], gb = GROUP[b.status];
      if (ga !== gb) return ga - gb;
      if (a.status === "out") return b.outRound - a.outRound || b.gd - a.gd || b.gf - a.gf || a.id - b.id;
      if (a.status === "idle") return a.id - b.id;
      return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id - b.id;
    });

    function statusCell(r) {
      var td = el("td", "col-status");
      var pill;
      var sub = "";
      if (r.status === "champ") pill = el("span", "st-pill champ", "🏆 پاڵەوان");
      else if (r.status === "second") pill = el("span", "st-pill second", "🥈 پلا دووێ");
      else if (r.status === "out") { pill = el("span", "st-pill out", "❌ دەرکەفت"); sub = ROUNDS[r.outRound] || ""; }
      else if (r.status === "in") { pill = el("span", "st-pill in", "د قارەمانیێ دا ✓"); sub = r.round || ""; }
      else pill = el("span", "st-pill idle", "هێشتا یاری نەکریە");
      // قوناغ: ل سەر ماڵپەری ل نک نیشانێ، د وێنەی دا ل ژێر نیشانێ
      if (sub) pill.appendChild(el("span", "st-sub", sub));
      td.appendChild(pill);
      return td;
    }

    var body = $("standingsBody");
    body.innerHTML = "";
    rows.forEach(function (r, i) {
      var cls = r.status === "out" ? "out" : r.status === "idle" ? "idle" : r.status === "champ" ? "champ top" : (i < 3 ? "top" : "");
      var tr = el("tr", cls);
      tr.appendChild(el("td", "rank")).appendChild(el("span", null, i + 1));
      var tc = el("td", "col-team");
      var tw = el("div", "st-team");
      tw.appendChild(logo(r.id, "st-logo"));
      var nm = el("span", "st-name", team(r.id).name);
      nm.dir = "auto";
      tw.appendChild(nm);
      tc.appendChild(tw);
      tr.appendChild(tc);
      [r.p, r.w, r.l, r.gf, r.ga].forEach(function (v) { tr.appendChild(el("td", null, v)); });
      tr.appendChild(el("td", "gd " + (r.gd > 0 ? "pos" : r.gd < 0 ? "neg" : ""), r.gd > 0 ? "+" + r.gd : r.gd));
      tr.appendChild(el("td", "pts", r.pts));
      tr.appendChild(statusCell(r));
      body.appendChild(tr);
    });
  }

  window.renderResults = renderResults;
})();
