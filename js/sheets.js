/* sheets.js — تابا «📋 لیستا یاریزانان»: فۆڕما A4 یا هەر یاریەکێ (ل دویف _reference/match-sheets.pdf). ڤی فایلی دەستکاری نەکە.
   تیم، لوگۆ، قوناغ، ڕێکەفت و ئەنجام ب خۆ ژ داتایێن ماڵپەری دهێن. ناڤێن یاریزانان ژ PLAYERS (enjam.js). */
(function () {
  "use strict";

  var DAYS = ["یەکشەمب", "دووشەمب", "سێشەمب", "چارشەمب", "پێنجشەمب", "ئەینی", "شەمبی"];
  var PAGE_W = 794, PAGE_H = 1123;          // A4 ب 96 DPI
  var current = 1;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function S() { return typeof SETTINGS !== "undefined" ? SETTINGS : {}; }
  function team(id) { return id && typeof TEAMS !== "undefined" && TEAMS[id] ? TEAMS[id] : null; }
  function matches() { return window.LEAGUE_MATCHES || []; }
  function parsePair(v) {
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(String(v || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }));
    return r ? [+r[1], +r[2]] : null;
  }
  function logoSrc(src) {
    // لوگۆ وەکی داتا (ب file:// ژی د وێنە و چاپێ دا کاردکەت)
    if (window.MITAN_LOGOS && window.MITAN_LOGOS[src]) return window.MITAN_LOGOS[src];
    return src;
  }
  function instLogo() {
    var src = S().instituteLogo || "";
    return window.MITAN_LOGO_DATA && /mitan\.jpg$/i.test(src) ? window.MITAN_LOGO_DATA : src;
  }

  // یاریزانێن تیمەکێ ژ PLAYERS (کلیل = ناڤێ تیمێ، دگەل ناڤێن کەڤن)
  // ژ yariyzan.js (PLAYERS_LIST) و enjam.js (PLAYERS)؛ ڕێزێن ڤالا ناهێنە هژمارتن
  function playersOf(id) {
    var find = window.LEAGUE_TEAM_ID;
    var srcs = [typeof PLAYERS_LIST !== "undefined" ? PLAYERS_LIST : null, typeof PLAYERS !== "undefined" ? PLAYERS : null];
    for (var s = 0; s < srcs.length; s++) {
      var P = srcs[s] || {};
      for (var k in P) {
        if (!(find && find(k) === id && Array.isArray(P[k]))) continue;
        var rows = P[k].filter(function (r) { return Array.isArray(r) && String(r[0] || "").trim(); });
        if (rows.length) return rows;
      }
    }
    return [];
  }

  function whenText(m) {
    if (!m.date) return null;
    var q = m.date.split("-"), d = new Date(+q[0], +q[1] - 1, +q[2]);
    return { day: DAYS[d.getDay()], date: q[2] + "/" + q[1] + "/" + q[0], time: (m.time || "").replace(/\s*ئێڤاری\s*/, "") };
  }

  // ---------- فۆڕما ئێک یاریێ ----------
  function buildSheet(no) {
    var m = matches()[no - 1] || {};
    var final = !!m.final;
    var page = el("div", "ms-page" + (final ? " final" : ""));
    var inner = el("div", "ms-inner");
    page.appendChild(inner);

    // سەری
    var head = el("div", "ms-head");
    var lg = instLogo();
    if (lg) { var li = el("img", "ms-logo"); li.src = lg; li.alt = ""; head.appendChild(li); }
    head.appendChild(el("div", "ms-title", S().dayTitle || S().drawTitle || ""));
    head.appendChild(el("div", "ms-sup", S().exportSupervisor || ""));
    var mp = el("div", "ms-mpill");
    mp.appendChild(el("span", null, "یاریا " + no));
    mp.appendChild(el("span", "ms-dia", "◆"));
    mp.appendChild(el("span", null, final ? "فاینەل 🏆" : (m.round || "")));
    head.appendChild(mp);
    var w = whenText(m), wl = el("div", "ms-when");
    if (w) {
      wl.appendChild(document.createTextNode(w.day + " · "));
      wl.appendChild(el("b", null, w.date));
      wl.appendChild(document.createTextNode(" · دەمژمێر "));
      wl.appendChild(el("b", null, w.time));
      wl.appendChild(document.createTextNode(" ئێڤاری"));
    } else wl.textContent = "ڕێکەفت: دێ پاشی هێتە دیارکرن";
    head.appendChild(wl);
    inner.appendChild(head);

    // VS
    var vs = el("div", "ms-vs");
    function side(id, ph) {
      var t = team(id), s = el("div", "ms-side" + (t ? "" : " tbd"));
      if (t && t.logo) { var im = el("img", "ms-tlogo"); im.src = logoSrc(t.logo); im.alt = ""; s.appendChild(im); }
      else s.appendChild(el("div", "ms-tlogo ph", t ? String(id) : "؟"));
      var nm = el("div", "ms-tname", t ? t.name : (ph || "؟"));
      nm.dir = "auto";
      s.appendChild(nm);
      if (!t) s.appendChild(el("div", "ms-writeline"));
      return s;
    }
    // ئەنجام د خانێن سپی دا ل هەردوو لایێن VS (ب خۆ ژ RESULTS، یان ڤالا بۆ نڤیسینێ)
    var gs = parsePair(m.result);
    vs.appendChild(side(m.home, m.homePh));
    vs.appendChild(el("div", "ms-score", gs ? gs[0] : ""));
    vs.appendChild(el("div", "ms-vsc", "VS"));
    vs.appendChild(el("div", "ms-score", gs ? gs[1] : ""));
    vs.appendChild(side(m.away, m.awayPh));
    inner.appendChild(vs);

    // لیستا یاریزانان
    var dv = el("div", "ms-divider");
    dv.appendChild(el("span", null, "لیستا یاریزانان"));
    inner.appendChild(dv);
    var lists = el("div", "ms-two");
    [m.home, m.away].forEach(function (id) {
      var t = team(id), pl = t ? playersOf(id) : [];
      var tb = el("table", "ms-table players");
      var hr = el("tr");
      hr.appendChild(el("th", "c-no", "#"));
      var th = el("th", "c-name");
      th.appendChild(document.createTextNode("ناڤێ یاریزانی "));
      var tn = el("span", "ms-gold", t ? t.name : "ناڤێ تیمی");
      tn.dir = "auto";
      th.appendChild(tn);
      th.appendChild(document.createTextNode(" —"));
      hr.appendChild(th);
      hr.appendChild(el("th", "c-shirt", "ژ. جلک"));
      var thead = el("thead");
      thead.appendChild(hr);
      tb.appendChild(thead);
      var body = el("tbody");
      for (var i = 0; i < 12; i++) {
        var p = pl[i] || [];
        var tr = el("tr");
        tr.appendChild(el("td", "c-no", i + 1));
        var nm = el("td", "c-name", p[0] ? p[0] + (window.MITAN_KEEPERS && window.MITAN_KEEPERS.isKeeper(p[1]) ? " 🧤" : "") : "");
        nm.dir = "auto";
        tr.appendChild(nm);
        tr.appendChild(el("td", "c-shirt", p[1] != null ? p[1] : ""));
        body.appendChild(tr);
      }
      tb.appendChild(body);
      lists.appendChild(tb);
    });
    inner.appendChild(lists);

    // کارت
    var cards = el("div", "ms-two");
    [["کارتا زەر", "yellow"], ["کارتا سۆر", "red"]].forEach(function (c) {
      var tb = el("table", "ms-table cards");
      var hr = el("tr");
      hr.appendChild(el("th", "c-no", "#"));
      var th = el("th", "c-name");
      th.appendChild(el("span", "ms-chip " + c[1]));
      th.appendChild(document.createTextNode(" " + c[0] + " · ناڤێ یاریزانی"));
      hr.appendChild(th);
      hr.appendChild(el("th", "c-team", "تیم"));
      hr.appendChild(el("th", "c-min", "خولەک"));
      var thead = el("thead");
      thead.appendChild(hr);
      tb.appendChild(thead);
      var body = el("tbody");
      for (var i = 0; i < 5; i++) {
        var tr = el("tr");
        tr.appendChild(el("td", "c-no", i + 1));
        tr.appendChild(el("td", "c-name"));
        tr.appendChild(el("td", "c-team"));
        tr.appendChild(el("td", "c-min"));
        body.appendChild(tr);
      }
      tb.appendChild(body);
      cards.appendChild(tb);
    });
    inner.appendChild(cards);

    // ئەنجام
    var g = parsePair(m.result), pn = parsePair(m.pens), win = team(m.winner);
    var rb = el("div", "ms-result");
    rb.appendChild(el("span", "ms-rlabel", "ئەنجاما یاریێ"));
    rb.appendChild(el("span", "ms-box big", g ? g[0] : ""));
    rb.appendChild(el("span", "ms-dash", "-"));
    rb.appendChild(el("span", "ms-box big", g ? g[1] : ""));
    rb.appendChild(el("span", "ms-plabel", "پێناڵتی"));
    rb.appendChild(el("span", "ms-box", pn ? pn[0] : ""));
    rb.appendChild(el("span", "ms-dash", "-"));
    rb.appendChild(el("span", "ms-box", pn ? pn[1] : ""));
    rb.appendChild(el("span", "ms-plabel", "سەرکەفتی"));
    var wn = el("span", "ms-winner", win ? win.name : "");
    wn.dir = "auto";
    rb.appendChild(wn);
    inner.appendChild(rb);

    // ئیمزا
    var sg = el("div", "ms-signs");
    ["ئیمزایا دادوەری:", "ئیمزایا سەرپەرشتیاری:"].forEach(function (t) {
      var d = el("div", "ms-sign");
      d.appendChild(el("span", null, t));
      d.appendChild(el("span", "ms-sline"));
      sg.appendChild(d);
    });
    inner.appendChild(sg);

    // بنی
    var ft = el("div", "ms-foot");
    ft.appendChild(el("div", "ms-fdia", "◆"));
    var fl = el("div");
    fl.appendChild(document.createTextNode((S().creditLabel || "بەرهەڤکرن و ئامادەکرن:") + " "));
    var cn = el("b", null, S().creditName || "Niwar Majeed");
    cn.dir = "ltr";
    fl.appendChild(cn);
    fl.appendChild(document.createTextNode(" · " + (S().footer || "پەیمانگەها میتان © 2026")));
    ft.appendChild(fl);
    inner.appendChild(ft);
    return page;
  }

  // ---------- هەلبژارتنا یاریێ ----------
  function buildPicker() {
    var box = $("sheetPicker");
    box.innerHTML = "";
    var RO = window.LEAGUE_ROUND_OF || [], ROUNDS = window.LEAGUE_ROUNDS || [];
    var groups = {};
    matches().forEach(function (m) {
      var r = RO[m.no - 1] || 0;
      (groups[r] = groups[r] || []).push(m);
    });
    Object.keys(groups).sort(function (a, b) { return a - b; }).forEach(function (r) {
      var sec = el("div", "sp-group");
      sec.appendChild(el("div", "sp-round", ROUNDS[r] === "فاینەل" ? "🏆 فاینەل" : ROUNDS[r]));
      var row = el("div", "sp-row");
      groups[r].sort(function (a, b) { return a.no - b.no; }).forEach(function (m) {
        var a = el("a", "sp-btn" + (m.no === current ? " active" : "") + (m.final ? " final" : "") + (m.winner ? " done" : ""));
        a.href = "#sheets-" + m.no;
        a.appendChild(el("span", "sp-no", "یاریا " + m.no + (m.winner ? " ✓" : "")));
        var teams = el("span", "sp-teams");
        [[m.home, m.homePh], [m.away, m.awayPh]].forEach(function (x, i) {
          var t = team(x[0]), s = el("span", "sp-team");
          if (t && t.logo) { var im = el("img", "sp-logo"); im.src = t.logo; im.alt = ""; s.appendChild(im); }
          else s.appendChild(el("span", "sp-logo ph", "؟"));
          var nm = el("span", "sp-name", t ? t.name : (x[1] || "؟"));
          nm.dir = "auto";
          s.appendChild(nm);
          teams.appendChild(s);
          if (!i) teams.appendChild(el("span", "sp-vs", "VS"));
        });
        a.appendChild(teams);
        var w = whenText(m);
        a.appendChild(el("span", "sp-when", w ? w.day + " " + w.date.slice(0, 5) + " · " + w.time : "ڕێکەفت: دێ پاشی هێتە دیارکرن"));
        row.appendChild(a);
      });
      sec.appendChild(row);
      box.appendChild(sec);
    });
  }

  // ناڤێن تیمان د VS دا: ئێک قەبارە بۆ هەردوو لایان، بچووک دبیت تنێ ئەگەر جه نەگریت
  function fitSheet(page) {
    var names = [].slice.call(page.querySelectorAll(".ms-tname"));
    if (!names.length || !names[0].clientWidth) return;
    var f = 24, min = 14;
    function over() { return names.some(function (n) { return n.scrollWidth > n.clientWidth + 1; }); }
    names.forEach(function (n) { n.style.fontSize = ""; });
    f = parseFloat(getComputedStyle(names[0]).fontSize);
    while (over() && f > min) { f--; names.forEach(function (n) { n.style.fontSize = f + "px"; }); }
  }

  // فۆڕما هەلبژارتی ب قەبارێ شاشێ (بێ بڕین)
  function fitView() {
    var holder = $("sheetView"), page = holder.firstChild;
    if (!page || holder.offsetParent === null) return;
    var s = Math.min(1, (holder.clientWidth - 4) / PAGE_W);
    page.style.transform = "scale(" + s + ")";
    holder.style.height = PAGE_H * s + "px";
  }

  function renderSheets() {
    if (!$("sheets")) return;
    var n = matches().length || 18;
    if (current < 1 || current > n) current = 1;
    buildPicker();
    var holder = $("sheetView");
    holder.innerHTML = "";
    var page = buildSheet(current);
    holder.appendChild(page);
    fitSheet(page);
    $("sheetTitle").textContent = "فۆڕما یاریا " + current;
    fitView();
  }

  function fromHash() {
    var r = /^#sheets(?:-(\d+))?$/.exec(location.hash);
    if (!r) return;
    if (r[1]) current = +r[1];
    renderSheets();
    // دەمێ یاریەک هاتە هەلبژارتن: لاپەڕ ب نەرمی دچیتە سەر فۆڕما وێ
    if (r[1]) setTimeout(function () {
      var bar = document.querySelector(".sheet-bar");
      if (bar) window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - 12, behavior: "smooth" });
    }, 80);
  }
  window.addEventListener("hashchange", fromHash);
  window.addEventListener("resize", fitView);
  // هەر جارەکا پانیا جهێ فۆڕمێ بگوهۆڕیت (ڤەکرنا تابێ، بچووککرنا پەنجەرێ، مۆبایل): فۆڕم ب خۆ دگونجیت
  if (window.ResizeObserver) new ResizeObserver(function () { fitView(); }).observe($("sheetView"));
  window.addEventListener("hashchange", function () { setTimeout(fitView, 0); });

  // ---------- چاپ ----------
  function printPages(nos) {
    var area = $("printArea");
    area.innerHTML = "";
    nos.forEach(function (no) { var pg = buildSheet(no); area.appendChild(pg); });
    area.style.display = "block";
    area.querySelectorAll(".ms-page").forEach(fitSheet);
    area.style.display = "";
    document.body.classList.add("printing-sheets");
    var imgs = [].slice.call(area.querySelectorAll("img"));
    Promise.all(imgs.map(function (i) { return i.decode ? i.decode().catch(function () {}) : null; })).then(function () {
      window.print();
    });
  }
  window.addEventListener("afterprint", function () {
    document.body.classList.remove("printing-sheets");
    $("printArea").innerHTML = "";
  });

  // ---------- وێنە (PNG ب 300 DPI: 2480×3508) ----------
  function shootSheet() {
    var SH = window.MITAN_SHARE;
    if (!SH) return;
    var hold = el("div", "share-hold");
    var page = buildSheet(current);
    hold.appendChild(page);
    document.body.appendChild(hold);
    fitSheet(page);
    SH.shoot(page, "mitan-lista-yariya-" + current + ".png", { ratio: 2480 / PAGE_W, cleanup: function () { hold.remove(); } });
  }

  function bind(id, fn) { var b = $(id); if (b) b.addEventListener("click", fn); }
  bind("sheetPrint", function () { printPages([current]); });
  bind("sheetPrintAll", function () {
    var all = [];
    for (var i = 1; i <= (matches().length || 18); i++) all.push(i);
    printPages(all);
  });
  bind("sheetShot", shootSheet);

  window.renderSheets = function () { renderSheets(); };
  window.MITAN_SHEETS = { buildSheet: buildSheet, fromHash: fromHash };
  setTimeout(fromHash, 0);
})();
