/* bracket.js — تیروپشک (قرعە) وەکی وێنەیێ فەرمی. ڤی فایلی دەستکاری نەکە.
   ژمارا تیمی = جهێ وی د تیروپشکێ دا. ڕێکا یاریان د app.js دا یە (LEAGUE_PATH).
   ژمارێن تیمان ژ سەری بۆ خوارێ نە (1–9 لایێ چەپێ، 10–19 لایێ ڕاستێ).
   یاریێن قوناغا ئێکێ (2-3، 11-12، 16-17) وەکی تیروپشکەکا بچووک ل دەرڤەیێ ستوونا تیمان دیار دبن.
   سەرکەفتی ب خۆ دچیتە قوناغا دویڤدا، ل دویف ئەنجامێن RESULTS (app.js ئامادە دکەت). */
(function () {
  "use strict";

  // دوو شێواز: «دوو لا» بۆ شاشێن پان (کۆمپیوتەر و تی ڤی)، «ئێک لا» بۆ مۆبایلێ
  // خانێن مەزن دا ناڤ ل سەر تی ڤی ژ دویر ب ساناهی بهێنە خواندن
  // EX: خانێن تیمێن قوناغا ئێکێ (ل دەرڤە)، EX_D: دویراتیا وان ژ ناڤەڕاستا یاریا وان
  // BOX: خانێن سەرکەفتیان (باریک و پان)، CENTER: جهێ ناڤبەرا هەردوو نیڤ دوماهیکان
  var DOUBLE = { EX_W: 350, EX_H: 70, EX_D: 46, SLOT_W: 350, SLOT_H: 78, PITCH: 108, BOX_W: 200, BOX_H: 60,
                 GAP: 20, CENTER: 60, CHAMP_W: 320, CHAMP_H: 96, FINAL_DY: 64 };
  // کێمترین قەبارەیا ناڤێن تیمان (پیکسلێن تیروپشکێ؛ ل سەر تی ڤی 1920 نێزیکی 18–20px)
  var MIN_SLOT_FONT = 27;
  var SINGLE = { EX_W: 190, EX_H: 36, EX_D: 21, SLOT_W: 230, SLOT_H: 38, PITCH: 48, BOX_W: 132, BOX_H: 34,
                 GAP: 30, CHAMP_W: 210, CHAMP_H: 56 };
  // HEADER_H: جهێ نڤیسینا سەری (بانەر) ل سەر تیروپشکێ، دا کو چ جاران ل سەر خانان نەکەڤیت.
  // BANNER_TOP / BANNER_H: جه و بلندیا بانەری د ناڤ ڤی جهی دا.
  var TROPHY_H = 170, HEADER_H = 260, BANNER_TOP = 16, BANNER_H = 176;
  var mode = null;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function latinDigits(s) {
    return String(s).replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
  }

  // یاریا ب ژمارە ژ LEAGUE_MATCHES (app.js ئامادە دکەت)
  function matchOf(no) {
    var L = window.LEAGUE_MATCHES || [];
    for (var i = 0; i < L.length; i++) if (L[i].no === no) return L[i];
    return null;
  }

  function teamContent(box, id) {
    var t = id && typeof TEAMS !== "undefined" && TEAMS[id];
    if (!t) return;
    if (t.logo) {
      var img = el("img");
      img.src = t.logo;
      img.alt = "";
      img.onerror = function () { img.remove(); };
      box.appendChild(img);
    }
    var nm = el("span", "bn-text", t.name);
    nm.dir = "auto";
    box.appendChild(nm);
  }

  var state = null;
  // جهێن تیروپشکێ یێن بەری نوکە هاتینە دانان: دا کو تیما نوو ب تیشکەکێ دیار ببیت
  var prevPlaced = null;

  function fit() {
    if (!state) return;
    var wrap = document.getElementById("bracketWrap");
    var s;
    if (isFull()) {
      // شاشا تەمام: تیروپشک هەمی شاشێ دگریت
      s = Math.min((wrap.clientWidth - 24) / state.w, (wrap.clientHeight - 76) / state.h, 2);
    } else {
      // مۆبایل: وەکی بەرێ (کێمتر نە ژ 0.5، ب سکرۆڵ). لاپتۆپ: هەمی تیروپشک دیار دبیت.
      s = Math.min(1, (wrap.clientWidth - 28) / state.w);
      // لیستا «تیمێن مایین» و هشیاری ل سەر تیروپشکێ نە: پێکڤە د ئێک شاشێ دا جه دگرن
      var extra = document.getElementById("drawHelper").offsetHeight + document.getElementById("drawWarn").offsetHeight;
      var chrome = document.getElementById("bracketFrame").offsetHeight - state.sizer.offsetHeight;  // دوگمە و پەراوێز
      if (mode !== "single") s = Math.min(s, (window.innerHeight - extra - chrome - 40) / state.h);
      s = Math.max(mode === "single" ? 0.5 : 0.35, s);
    }
    state.board.style.transform = "scale(" + s + ")";
    state.sizer.style.width = state.w * s + "px";
    state.sizer.style.height = state.h * s + "px";
  }

  function useDouble() {
    return isFull() || window.innerWidth >= 700;
  }

  // دارا تیروپشکێ ژ ڕێکا قارەمانیێ (LEAGUE_PATH): ژمارە = تیم، "W9" = سەرکەفتیێ یاریا 9.
  // ستوون (col): 0 = تیمێن قوناغا ئێکێ (دەرڤە)، 1 = ستوونا تیمان، 2 = 16 تیم، 3 = چارەک،
  // 4 = نیڤ دوماهیک، 5 = فاینەل (تنێ ل مۆبایلێ). ڕێزێن ستوونا 1 ژ سەری بۆ خوارێ دهێنە دانان.
  function build(ref, col, C, all, rows) {
    var n;
    if (typeof ref === "number") {
      n = { col: col, num: ref, team: TEAMS[ref] ? ref : null, slot: true, extra: col === 0,
            w: col === 0 ? C.EX_W : C.SLOT_W, h: col === 0 ? C.EX_H : C.SLOT_H };
      if (col >= 1) { n.cy = rows.length * C.PITCH + C.SLOT_H / 2; rows.push(n); }
    } else {
      var no = +String(ref).slice(1), pair = window.LEAGUE_PATH[no - 1], m = matchOf(no);
      n = { col: col, no: no, team: m ? m.winner : null, w: col === 1 ? C.SLOT_W : C.BOX_W, h: C.BOX_H };
      if (col <= 1) {
        // یاریا قوناغا ئێکێ: د ستوونا تیمان دا، و هەردوو تیمێن وێ ل دەرڤە
        n.cy = rows.length * C.PITCH + C.SLOT_H / 2;
        rows.push(n);
        n.kids = [build(pair[0], 0, C, all, rows), build(pair[1], 0, C, all, rows)];
        n.kids[0].cy = n.cy - C.EX_D;
        n.kids[1].cy = n.cy + C.EX_D;
      } else {
        n.kids = [build(pair[0], col - 1, C, all, rows), build(pair[1], col - 1, C, all, rows)];
        n.cy = (n.kids[0].cy + n.kids[1].cy) / 2;
      }
      n.kids[0].parent = n.kids[1].parent = n;
    }
    all.push(n);
    return n;
  }

  // هێڵ، خانە، کوپ و فاینەل د ناڤ board دا دکێشیت (بۆ شاشێ و بۆ وێنەیان)
  function paint(board, all, C, cls, w, h, offY, champ, trophyX, trophyY, live) {
    board.className = "bracket " + cls;
    board.style.width = w + "px";
    board.style.height = h + "px";

    // هێڵ
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "lines");
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    all.forEach(function (n) {
      if (!n.kids) return;
      var y2 = n.cy + offY;
      n.kids.forEach(function (k) {
        if (n.below) {
          // نیڤ دوماهیک → فاینەل (ل ژێر وان): هێڵا ستوونی
          var fx = k.x + k.w / 2;
          var pb = document.createElementNS(NS, "path");
          pb.setAttribute("d", "M" + fx + " " + (k.cy + offY + k.h / 2) + " V" + (n.cy + offY - n.h / 2));
          if (k.team && k.team === n.team) pb.setAttribute("class", "win");
          svg.appendChild(pb);
          return;
        }
        var x1, mx, x2;
        if (k.x < n.x) { x1 = k.x + k.w; x2 = n.x; mx = x2 - C.GAP / 2; }
        else { x1 = k.x; x2 = n.x + n.w; mx = x2 + C.GAP / 2; }
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M" + x1 + " " + (k.cy + offY) + " H" + mx + " V" + y2 + " H" + x2);
        if (k.team && k.team === n.team) path.setAttribute("class", "win");
        svg.appendChild(path);
      });
    });
    board.appendChild(svg);

    // خانە
    all.forEach(function (n) {
      var lost = n.parent && n.parent.team && n.team !== n.parent.team;
      var box;
      if (n.slot && !n.champ) {
        var fresh = live && prevPlaced && TEAMS[n.num] && TEAMS[n.num].placed && !prevPlaced[n.num];
        box = el("div", "bslot" + (n.side === "r" ? " right" : "") + (n.extra ? " extra" : "") + (lost ? " lost" : "") + (fresh ? " just-drawn" : ""));
        box.appendChild(el("span", "bnum", n.num));
        var name = el("span", "bname");
        teamContent(name, n.team);
        box.appendChild(name);
      } else {
        // خانا سەرکەفتی یا تیمەک تێدا (نە فاینەل): سپی وەکی خانێن تیمان
        box = el("div", "bnode" + (n.champ ? " champ" : "") + (n.champ && n.team ? " crowned" : "") + (!n.champ && n.team ? " filled" : "") + (lost ? " lost" : ""));
        teamContent(box, n.team);
        // خانا زێڕین یا پاڵەوانی: بەری فاینەلێ ڤالایە
        if (n.champ && !n.team) box.appendChild(el("span", "bn-ph", "🏆 پاڵەوان"));
        if (n.no) box.appendChild(el("span", "bno", n.no));
      }
      box.style.left = n.x + "px";
      box.style.top = (n.cy + offY - n.h / 2) + "px";
      box.style.width = n.w + "px";
      box.style.height = n.h + "px";
      board.appendChild(box);
    });

    // کوپ و ناڤێ پاڵەوانی
    if (!champ) return;
    var heroTrophy = document.querySelector(".hero .trophy");
    if (heroTrophy) {
      var tr = heroTrophy.cloneNode(true);
      tr.setAttribute("class", "b-trophy");
      tr.style.left = trophyX + "px";
      tr.style.top = (trophyY + offY) + "px";
      board.appendChild(tr);
    }
    var label = el("div", "b-label", "فاینەل");
    label.style.left = champ.x + C.CHAMP_W / 2 + "px";
    label.style.top = (champ.cy + offY + C.CHAMP_H / 2 + 14) + "px";
    board.appendChild(label);

  }

  function render() {
    var board = document.getElementById("bracket");
    if (!board || typeof TEAMS === "undefined") return;
    board.innerHTML = "";

    var ids = Object.keys(TEAMS).map(Number).sort(function (a, b) { return a - b; });
    document.getElementById("drawCount").textContent = ids.length;

    var frame = document.getElementById("bracketFrame");
    var bg = typeof SETTINGS !== "undefined" && SETTINGS.drawBackground;
    if (bg) frame.style.setProperty("--draw-bg", 'url("' + bg + '")');
    else frame.style.removeProperty("--draw-bg");
    if (ids.length < 2) return;

    var S = typeof SETTINGS !== "undefined" ? SETTINGS : {};
    var PATH = window.LEAGUE_PATH;
    if (!PATH) return;
    var FINAL = PATH.length;
    var dbl = useDouble();
    mode = dbl ? "double" : "single";
    var C = dbl ? DOUBLE : SINGLE;
    var all = [], champ, w, h, offY, D = 0, header = false;
    var fm = matchOf(FINAL);

    function colX(col) {
      if (col === 0) return 0;
      if (col === 1) return C.EX_W + C.GAP;
      return C.EX_W + C.SLOT_W + 2 * C.GAP + (col - 2) * (C.BOX_W + C.GAP);
    }
    var trophyX, trophyY;

    if (dbl) {
      // لایێ چەپێ: نیڤ دوماهیکا 16، لایێ ڕاستێ: نیڤ دوماهیکا 17.
      // هەردوو نیڤ دوماهیک ل ناڤەڕاستێ، کوپ ل سەر وان و فاینەل ل ژێر وان.
      var fp = PATH[FINAL - 1];
      var allL = [], allR = [], rL = [], rR = [];
      var rootL = build(fp[0], 4, C, allL, rL), rootR = build(fp[1], 4, C, allR, rR);
      D = 4;
      var sideW = colX(4) + C.BOX_W;
      w = sideW * 2 + C.CENTER;
      var rows = Math.max(rL.length, rR.length);
      var shiftL = (rows - rL.length) * C.PITCH / 2, shiftR = (rows - rR.length) * C.PITCH / 2;
      allL.forEach(function (n) { n.x = colX(n.col); n.cy += shiftL; n.side = "l"; });
      allR.forEach(function (n) { n.x = w - colX(n.col) - n.w; n.cy += shiftR; n.side = "r"; });
      all = allL.concat(allR);
      var semiY = Math.max(rootL.cy, rootR.cy);
      champ = { no: FINAL, x: (w - C.CHAMP_W) / 2, cy: semiY + C.BOX_H / 2 + C.FINAL_DY + C.CHAMP_H / 2,
                w: C.CHAMP_W, h: C.CHAMP_H, champ: true, below: true,
                kids: [rootL, rootR], team: fm ? fm.winner : null };
      rootL.parent = rootR.parent = champ;
      all.push(champ);
      trophyX = w / 2 - 75;
      trophyY = Math.min(rootL.cy, rootR.cy) - C.BOX_H / 2 - TROPHY_H - 6;

      // بانەر هەمیشە دیار دبیت، پشتی داخستنا پەیاما مەزن ژی (د شاشا تەمام دا)
      header = !!(S.drawTitle || S.drawWelcome);
      var top0 = header ? HEADER_H : 20;
      offY = top0 - Math.min(0, trophyY);
      h = offY + Math.max(rows * C.PITCH, champ.cy + C.CHAMP_H / 2 + 70) + 16;
    } else {
      var rowsS = [];
      var root = build("W" + FINAL, 5, C, all, rowsS);
      all.forEach(function (n) { n.x = colX(n.col); n.side = "l"; });
      root.w = C.CHAMP_W; root.h = C.CHAMP_H; root.champ = true;
      champ = root;
      trophyX = champ.x + (C.CHAMP_W - 150) / 2;
      trophyY = champ.cy - C.CHAMP_H / 2 - TROPHY_H;
      offY = Math.max(0, -trophyY + 20);
      w = colX(root.col) + C.CHAMP_W + 4;
      h = Math.max(rowsS.length * C.PITCH, root.cy + C.CHAMP_H / 2 + 60) + offY;
    }

    paint(board, all, C, mode, w, h, offY, champ, trophyX, trophyY, true);

    // نڤیسینا بخێرهاتنێ: ل سەری تیروپشکێ، دویری خانان
    if (header) {
      var maxW = w - 2 * colX(Math.min(2, D));
      var bw = Math.min(1400, maxW);
      var wb = el("div", "b-welcome");
      wb.style.left = (w - bw) / 2 + "px";
      wb.style.top = BANNER_TOP + "px";
      wb.style.width = bw + "px";
      wb.style.height = BANNER_H + "px";
      if (S.drawTitle) wb.appendChild(el("div", "bw-title", S.drawTitle));
      var dv = el("div", "bw-divider");
      dv.appendChild(el("span"));
      wb.appendChild(dv);
      if (S.drawWelcome) wb.appendChild(el("div", "bw-text", S.drawWelcome));
      board.appendChild(wb);
    }

    if (window.LEAGUE_UI) window.LEAGUE_UI.champBanner("champDraw");

    prevPlaced = {};
    for (var k in TEAMS) if (TEAMS[k] && TEAMS[k].placed) prevPlaced[k] = true;

    state = { board: board, sizer: board.parentNode, w: w, h: h };
    fillWelcome();
    fit();
    fitNames(board);
  }

  // ---------- تیروپشک بۆ وێنەیان: ل دەرڤەی شاشێ، ب قەبارەکا جێگیر و بێ transform ----------
  // side: "both" (هەردوو لا + فاینەل)، "left" یان "right" (نیڤەک ب تنێ). cls: کلاسێن CSS یێن زێدە.
  // flat: هەردوو نیڤ ب ئێک ئاراستە (تیم ل چەپێ، نیڤ دوماهیک ل ڕاستێ) — بۆ ستۆریا تیروپشکێ
  function drawExport(board, C, side, cls, flat) {
    var PATH = window.LEAGUE_PATH;
    if (!PATH || typeof TEAMS === "undefined") return { w: 0, h: 0 };
    board.innerHTML = "";
    var FINAL = PATH.length, fp = PATH[FINAL - 1], fm = matchOf(FINAL);
    function colX(col) {
      if (col === 0) return 0;
      if (col === 1) return C.EX_W + C.GAP;
      return C.EX_W + C.SLOT_W + 2 * C.GAP + (col - 2) * (C.BOX_W + C.GAP);
    }
    var nL = [], nR = [], rL = [], rR = [], rootL = null, rootR = null;
    if (side !== "right") rootL = build(fp[0], 4, C, nL, rL);
    if (side !== "left") rootR = build(fp[1], 4, C, nR, rR);
    var sideW = colX(4) + C.BOX_W;
    var w = side === "both" ? sideW * 2 + C.CENTER : sideW;
    var rows = Math.max(rL.length, rR.length);
    var shL = (rows - rL.length) * C.PITCH / 2, shR = (rows - rR.length) * C.PITCH / 2;
    nL.forEach(function (n) { n.x = colX(n.col); n.cy += shL; n.side = "l"; });
    nR.forEach(function (n) { n.x = flat ? colX(n.col) : w - colX(n.col) - n.w; n.cy += shR; n.side = flat ? "l" : "r"; });
    var all = nL.concat(nR), champ = null, trophyX = 0, trophyY = 0;
    if (side === "both") {
      var semiY = Math.max(rootL.cy, rootR.cy);
      champ = { no: FINAL, x: (w - C.CHAMP_W) / 2, cy: semiY + C.BOX_H / 2 + C.FINAL_DY + C.CHAMP_H / 2,
                w: C.CHAMP_W, h: C.CHAMP_H, champ: true, below: true,
                kids: [rootL, rootR], team: fm ? fm.winner : null };
      rootL.parent = rootR.parent = champ;
      all.push(champ);
      trophyX = w / 2 - 75;
      trophyY = semiY - C.BOX_H / 2 - TROPHY_H - 6;
    }
    var h = Math.max(rows * C.PITCH, champ ? champ.cy + C.CHAMP_H / 2 + 70 : 0);
    paint(board, all, C, "double " + (cls || ""), w, h, 0, champ, trophyX, trophyY, false);
    var root = rootL || rootR;
    return { w: w, h: h, semi: root ? { x: root.x, cy: root.cy, w: root.w, h: root.h, team: root.team } : null };
  }

  // ناڤێن تیمان هەمیشە ل سەر ئێک ڕێز، بێ "...".
  // خانێن سپی: هەمی ناڤ ب ئێک قەبارە — مەزنترین قەبارە یا درێژترین ناڤ تێدا جه دگریت
  // (نە مەزنتر ژ قەبارێ ئاسایی و نە بچووکتر ژ MIN_SLOT_FONT). تنێ ناڤەکێ زۆر درێژ ب تنێ بچووکتر دبیت.
  // خانێن سەرکەفتیان و فاینەل: ئێک ڕێز، تنێ ئەو ناڤێ جه نەگریت کێمەک بچووک دبیت.
  function fitNames(board, minFont) {
    function shrink(t, min) {
      var f = parseFloat(t.style.fontSize) || parseFloat(getComputedStyle(t).fontSize);
      while (t.scrollWidth > t.clientWidth + 1 && f > min) { f--; t.style.fontSize = f + "px"; }
    }
    var slots = Array.prototype.slice.call(board.querySelectorAll(".bslot .bn-text"));
    if (slots.length && slots[0].parentNode.clientWidth) {  // بەش نەدیارە؟ پشتی ڤەکرنێ دووبارە دهێتە کرن
      slots.forEach(function (t) { t.style.fontSize = ""; });
      var base = parseFloat(getComputedStyle(slots[0]).fontSize), ratio = 1;
      slots.forEach(function (t) { if (t.scrollWidth > t.clientWidth) ratio = Math.min(ratio, t.clientWidth / t.scrollWidth); });
      var min = minFont != null ? Math.min(base, minFont) : mode === "double" ? Math.min(base, MIN_SLOT_FONT) : base * 0.7;
      var shared = Math.max(min, Math.min(base, Math.floor(base * ratio)));
      slots.forEach(function (t) { t.style.fontSize = shared + "px"; shrink(t, base * 0.5); });
    }
    board.querySelectorAll(".bnode .bn-text").forEach(function (t) {
      if (!t.parentNode.clientWidth) return;
      t.style.fontSize = "";
      shrink(t, parseFloat(getComputedStyle(t).fontSize) * 0.5);
    });
  }

  // دوگمەیا شاشا تەمام: کلیکەک مەزن دکەت، کلیکەکا دی دزڤڕینیت
  function isFull() {
    var f = document.getElementById("bracketFrame");
    return !!f && f.classList.contains("is-full");
  }

  // پەیاما بخێرهاتنێ: د شاشا تەمام دا مەزن دیار دبیت.
  // پشتی «داخستن»، هەتا Refresh نەکەی دیار نابیت.
  var welcomeClosed = false;

  function fillWelcome() {
    var S = typeof SETTINGS !== "undefined" ? SETTINGS : {};
    var has = !!(S.drawTitle || S.drawWelcome);
    ["wo", "wc"].forEach(function (p) {
      document.getElementById(p + "Title").textContent = S.drawTitle || "";
      document.getElementById(p + "Text").textContent = S.drawWelcome || "";
    });
    var logo = document.getElementById("woLogo");
    if (S.instituteLogo) { logo.src = S.instituteLogo; logo.hidden = false; } else logo.hidden = true;
    document.getElementById("welcomeCard").hidden = !has || welcomeClosed;
    document.getElementById("welcomeOverlay").hidden = !has || welcomeClosed || !isFull();
  }

  document.getElementById("woClose").addEventListener("click", function () {
    welcomeClosed = true;
    render();
  });

  function setFull(on) {
    var f = document.getElementById("bracketFrame");
    f.classList.toggle("is-full", on);
    document.body.classList.toggle("no-scroll", on);
    document.getElementById("fullLabel").textContent = on ? "زڤڕین" : "شاشا تەمام";
    document.getElementById("fullBtn").title = on ? "زڤڕین" : "شاشا تەمام";
    render();
  }

  document.getElementById("fullBtn").addEventListener("click", function () {
    var f = document.getElementById("bracketFrame");
    if (!isFull()) {
      setFull(true);
      if (f.requestFullscreen) f.requestFullscreen().catch(function () {});
    } else {
      setFull(false);
      if (document.fullscreenElement) document.exitFullscreen();
    }
  });

  // ئەگەر ب دوگمەیا Esc ژ شاشا تەمام دەرکەفت
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && isFull()) setFull(false);
    else fit();
  });

  window.addEventListener("resize", function () {
    if (mode && mode !== (useDouble() ? "double" : "single")) render();
    else fit();
  });
  window.renderBracket = render;
  window.MITAN_BRACKET = { drawExport: drawExport, fitNames: fitNames };
})();
