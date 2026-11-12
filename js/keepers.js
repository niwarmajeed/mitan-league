/* keepers.js — تابا «🧤 گۆلچی»: باشترین گۆلچیێ قارەمانیێ. ڤی فایلی دەستکاری نەکە.
   گۆلچی ژ yariyzan.js دهێتە ناسین: ئەو یاریزانێ ژمارا جلکی «1» یان «G» بیت.
   گۆلێن لێ هاتین ب خۆ ژ RESULTS (گۆلێن تیما بەرامبەر د هەر یاریەکێ دا). پێناڵتیێن دوماهیا یاریێ ناهێنە هژمارتن،
   یاریا خۆ ڤەکێشانێ ژی وەکی یاریەکێ دهێتە هژمارتن (ب ئەنجاما فەرمی، وەکی 3 - 0). */
(function () {
  "use strict";

  var COLS = 5;   // زێدەترین یاری بۆ تیمەکێ (قوناغا ئێکێ هەتا فاینەلێ)

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
  function parsePair(v) {
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(latin(v));
    return r ? [+r[1], +r[2]] : null;
  }
  function team(id) { return (typeof TEAMS !== "undefined" && TEAMS[id]) || { name: "تیم " + id, logo: "" }; }

  // نیشانا گۆلچی: ژمارا جلکی «1»، یان پیتا G (یان گ) ل نک ژمارێ
  function isKeeper(mark) {
    var m = latin(mark).trim();
    return m === "1" || /[gG]|گ/.test(m);
  }

  // گۆلچیێ تیمەکێ ژ yariyzan.js (PLAYERS_LIST) یان enjam.js (PLAYERS)
  function keeperOf(id) {
    var find = window.LEAGUE_TEAM_ID;
    var srcs = [typeof PLAYERS_LIST !== "undefined" ? PLAYERS_LIST : null, typeof PLAYERS !== "undefined" ? PLAYERS : null];
    for (var s = 0; s < srcs.length; s++) {
      var P = srcs[s] || {};
      for (var k in P) {
        if (!(find && find(k) === id && Array.isArray(P[k]))) continue;
        for (var i = 0; i < P[k].length; i++) {
          var r = P[k][i];
          if (Array.isArray(r) && String(r[0] || "").trim() && isKeeper(r[1])) return String(r[0]).trim();
        }
      }
    }
    return "";
  }

  function compute() {
    var M = window.LEAGUE_MATCHES || [];
    var ids = typeof TEAMS !== "undefined" ? Object.keys(TEAMS).map(Number) : [];
    var rows = {};
    ids.forEach(function (id) { rows[id] = { team: id, name: keeperOf(id), games: [], out: false }; });
    M.slice().sort(function (a, b) { return a.no - b.no; }).forEach(function (m) {
      var g = parsePair(m.result);
      if (!g || !m.home || !m.away) return;
      if (m.winner) rows[m.winner === m.home ? m.away : m.home] && (rows[m.winner === m.home ? m.away : m.home].out = true);
      if (rows[m.home]) rows[m.home].games.push({ no: m.no, ga: g[1] });
      if (rows[m.away]) rows[m.away].games.push({ no: m.no, ga: g[0] });
    });
    var list = ids.map(function (id) {
      var r = rows[id];
      r.played = r.games.length;
      r.ga = r.games.reduce(function (s, x) { return s + x.ga; }, 0);
      r.clean = r.games.filter(function (x) { return x.ga === 0; }).length;
      r.avg = r.played ? r.ga / r.played : 99;
      return r;
    });
    // یاسا (نەدیار): تێکڕایا گۆلێن لێ هاتین د یاریەکێ دا (کێمتر باشترە)، پاشی یاریێن بێ گۆل (پتر)،
    // پاشی یاریێن پتر، پاشی گۆلێن کێمتر، پاشی ژمارا جهێ تیمێ. یێن هێشتا یاری نەکرین ل دوماهیێ.
    list.sort(function (a, b) {
      if (!a.played !== !b.played) return a.played ? -1 : 1;
      return a.avg - b.avg || b.clean - a.clean || b.played - a.played || a.ga - b.ga || a.team - b.team;
    });
    list.forEach(function (r, i) { r.rank = i + 1; });
    return { list: list };
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

  function buildTable(list) {
    var wrap = el("div", "sc-wrap gk-wrap");
    var t = el("table", "scorers keepers");
    var hr = el("tr");
    hr.appendChild(el("th", "sc-rank", "پلە"));
    hr.appendChild(el("th", "sc-player", "گۆلچی"));
    hr.appendChild(el("th", "sc-team", "تیم"));
    for (var c = 1; c <= COLS; c++) hr.appendChild(el("th", "gk-g", c));
    hr.appendChild(el("th", "gk-ga", "گۆل لێ هاتین"));
    hr.appendChild(el("th", "gk-clean", "🧤 بێ گۆل"));
    var thead = el("thead");
    thead.appendChild(hr);
    t.appendChild(thead);
    var tb = el("tbody");
    list.forEach(function (r) {
      var tr = el("tr", (r.rank === 1 && r.played ? "first " : "") + (r.played ? "" : "idle"));
      var rc = el("td", "sc-rank");
      rc.appendChild(el("span", "sc-rk" + (r.rank <= 3 && r.played ? " r" + r.rank : ""), r.rank));
      var medal = !r.played ? "" : r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : "";
      if (medal) rc.appendChild(el("span", "sc-medal", medal));
      tr.appendChild(rc);
      var pc = el("td", "sc-player");
      var nm = el("span", "sc-name" + (r.name ? "" : " gk-none"), r.name || "گۆلچیێ " + team(r.team).name);
      nm.dir = "auto";
      pc.appendChild(nm);
      if (r.rank === 1 && r.played) pc.appendChild(el("span", "sc-boot", "🧤 باشترین گۆلچی"));
      tr.appendChild(pc);
      var tc = el("td", "sc-team");
      var tw = el("div", "sc-tw");
      tw.appendChild(logo(r.team));
      var tn = el("span", "sc-tname", team(r.team).name);
      tn.dir = "auto";
      tw.appendChild(tn);
      if (r.out) tw.appendChild(el("span", "sc-out", "دەرکەفت"));
      tc.appendChild(tw);
      tr.appendChild(tc);
      for (var c = 0; c < COLS; c++) {
        var g = r.games[c];
        var td = el("td", "gk-g" + (g ? (g.ga === 0 ? " clean" : "") : " none"), g ? g.ga : "");
        if (g) td.title = "یاریا " + g.no;
        tr.appendChild(td);
      }
      tr.appendChild(el("td", "gk-ga", r.played ? r.ga : "–"));
      tr.appendChild(el("td", "gk-clean", r.played ? r.clean : "–"));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    return wrap;
  }

  function render() {
    var box = $("gkTable");
    if (!box) return;
    var r = compute();
    box.innerHTML = "";
    box.appendChild(buildTable(r.list));
    var missing = r.list.filter(function (x) { return !x.name; }).length;
    var mn = $("gkMissing");
    mn.hidden = !missing;
    mn.textContent = missing ? "⚠ ناڤێ گۆلچیێ " + missing + " تیمان هێشتا نەهاتیە نڤیسین. د yariyzan.js دا، ل نک ناڤێ گۆلچی ژمارا «1» یان پیتا «G» بنڤیسە." : "";
  }

  window.renderKeepers = render;
  window.MITAN_KEEPERS = { compute: compute, buildTable: buildTable, isKeeper: isKeeper };
})();
