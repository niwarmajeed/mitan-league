/* share.js — دوگمێن «📷 وێنە»: وێنەیێن PNG بۆ فەیسبووک، ئینستاگرام و تێلێگرامێ. ڤی فایلی دەستکاری نەکە.
   کتێبخانە: js/lib/html-to-image.js (ل ناڤ پرۆژەی، بێ ئینتەرنێت کاردکەت).
   فۆنت: js/lib/fonts.js، لوگۆیا میتان: js/lib/mitan-logo.js، لوگۆیێن تیمان: js/lib/team-logos.js
   (وەکی داتا، دا کو ب file:// ژی کار بکەت).
   هەمی وێنە ل دەرڤەی شاشێ ب قەبارەکا جێگیر دهێنە دروستکرن (نە ژ وێنەیێ بچووککری یێ سەر شاشێ). */
(function () {
  "use strict";

  var FILE_MSG = "ئەڤ وێنە لوگۆیەکا نوو تێدایە و ب ڤەکرنا index.html ب دوو کلیکان نەشێت بهێتە دروستکرن. " +
                 "تکایە ماڵپەری ب start.bat ڤەکە، پاشی جارەکا دی «📷 وێنە» لێبدە.";

  // قەبارێن وێنەیان (پیکسلێن CSS؛ وێنە ب pixelRatio مەزنتر دبیت)
  var POSTER = { W: 2880, H: 1620, RATIO: 4 / 3 };     // ← 3840×2160 (16:9)
  var PORTRAIT = { W: 1080, H: 1350, RATIO: 2 };       // ← 2160×2700 (4:5)
  // قەبارێن وێنەیێن ستوونی (ب pixelRatio 2):
  //   پۆست 4:5 ← 2160×2700 (ئینستاگرام/فەیسبووک)، ستۆری 9:16 ← 2160×3840 (ستۆریێن ئینستاگرام و تێلێگرامێ)،
  //   چوارگۆش 1:1 ← 2160×2160
  var FORMATS = {
    post:   { W: 1080, H: 1350, tag: "",        label: "🖼 پۆست — 4:5 (ئینستاگرام / فەیسبووک)" },
    story:  { W: 1080, H: 1920, tag: "-story",  label: "📱 ستۆری — 9:16 (ئینستاگرام / تێلێگرام)" },
    square: { W: 1080, H: 1080, tag: "-square", label: "⬛ چوارگۆش — 1:1" }
  };
  var F = FORMATS.post;  // قەبارێ وێنەیێ نوکە
  function named(base) { return base.replace(/\.png$/, F.tag + ".png"); }

  // تیروپشکا وێنەیێ مەزن (16:9)
  var C_POSTER = { EX_W: 386, EX_H: 96, EX_D: 54, SLOT_W: 386, SLOT_H: 104, PITCH: 158, BOX_W: 170, BOX_H: 72,
                   GAP: 18, CENTER: 40, CHAMP_W: 340, CHAMP_H: 104, FINAL_DY: 56 };
  // نیڤێ تیروپشکێ بۆ مۆبایلێ (4:5): خانێن تیمان مەزن، خانێن سەرکەفتیان باریک
  var C_HALF = { EX_W: 366, EX_H: 92, EX_D: 52, SLOT_W: 366, SLOT_H: 104, PITCH: 124, BOX_W: 80, BOX_H: 60,
                 GAP: 12, CENTER: 0, CHAMP_W: 0, CHAMP_H: 0, FINAL_DY: 0 };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function S() { return typeof SETTINGS !== "undefined" ? SETTINGS : {}; }
  function pad(n) { return String(n).padStart(2, "0"); }

  // ---------- پەیام (… وێنە دهێتە ئامادەکرن / ✓ وێنە هاتە دابەزاندن) ----------
  var toastEl = null, toastTimer = null;
  function toast(msg, kind, ms) {
    if (!toastEl) toastEl = el("div", "shot-toast");
    // د شاشا تەمام دا تنێ بەشێ تیروپشکێ دیار دبیت، ئینا پەیام دچیتە ناڤ وی
    var host = document.fullscreenElement || document.body;
    if (toastEl.parentNode !== host) host.appendChild(toastEl);
    toastEl.textContent = msg;
    toastEl.className = "shot-toast show " + (kind || "");
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(function () { toastEl.className = "shot-toast"; }, ms);
  }

  function logoData() {
    var src = S().instituteLogo || "";
    return window.MITAN_LOGO_DATA && /mitan\.jpg$/i.test(src) ? window.MITAN_LOGO_DATA : src;
  }

  // وێنەیێن ناڤ وێنەیێ دبنە داتا (لوگۆیا میتان و لوگۆیێن تیمان)، دا کو ب file:// ژی کار بکەت.
  function prepImages(root) {
    var restore = [], blocked = [], waits = [];
    root.querySelectorAll("img").forEach(function (img) {
      var src = img.getAttribute("src");
      if (!src || img.hidden) return;
      var data = /^data:/.test(src) ? null :
                 (window.MITAN_LOGO_DATA && src === S().instituteLogo) ? window.MITAN_LOGO_DATA :
                 (window.MITAN_LOGOS && window.MITAN_LOGOS[src]) || null;
      if (data) {
        img.setAttribute("src", data);
        restore.push(function () { img.setAttribute("src", src); });
      } else if (!/^data:/.test(src) && location.protocol === "file:" && img.offsetParent !== null) {
        blocked.push(src);
      }
      if (img.decode) waits.push(img.decode().catch(function () {}));
    });
    return { restore: restore, blocked: blocked, ready: Promise.all(waits) };
  }

  function download(url, name) {
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  var busy = false;
  // opts: ratio (pixelRatio)، width (پانیا نێزیک)، before (پشتی فۆنت و وێنە ئامادە بوون)، filter، cleanup
  function shoot(node, name, opts) {
    opts = opts || {};
    var lib = window.htmlToImage;
    if (!lib) {
      toast("⚠ فایلێ js/lib/html-to-image.js نەهاتە بارکرن.", "err", 8000);
      if (opts.cleanup) opts.cleanup();
      return Promise.resolve(false);
    }
    var prep = prepImages(node);
    function done() {
      prep.restore.forEach(function (f) { f(); });
      if (opts.cleanup) opts.cleanup();
    }
    if (prep.blocked.length) { done(); toast("⚠ " + FILE_MSG, "err", 12000); return Promise.resolve(false); }

    toast("… وێنە دهێتە ئامادەکرن", "wait", 0);
    var ratio = opts.ratio || Math.max(2, Math.min(4, (opts.width || 3000) / Math.max(1, node.offsetWidth)));
    var fontCSS = window.MITAN_FONT_CSS;
    return prep.ready
      .then(function () { return document.fonts ? document.fonts.ready : null; })
      .then(function () { if (opts.before) opts.before(); })
      .then(function () {
        return lib.toPng(node, {
          pixelRatio: ratio,
          fontEmbedCSS: fontCSS || undefined,
          skipFonts: !fontCSS,
          filter: opts.filter
        });
      })
      .then(function (url) {
        download(url, name);
        done();
        toast("✓ وێنە هاتە دابەزاندن", "ok", 3500);
        return true;
      })
      .catch(function (err) {
        if (window.console) console.error(err);
        done();
        toast("⚠ " + (location.protocol === "file:" ? FILE_MSG : "دروستکرنا وێنەی سەرنەکەفت. جارەکا دی تاقی بکە."), "err", 12000);
        return false;
      });
  }

  // ئێک وێنە ل جارێ (دوو وێنەیێن مۆبایلێ ل دویف ئێک)
  function run(job) {
    if (busy) return;
    busy = true;
    Promise.resolve().then(job).then(function () { busy = false; }, function () { busy = false; });
  }

  // ---------- بنەما: لاپەرەکێ ل دەرڤەی شاشێ ب قەبارەکا جێگیر ----------
  function stage(W, H, cls) {
    var hold = el("div", "share-hold");
    var p = el("div", cls);
    p.style.width = W + "px";
    p.style.height = H + "px";
    hold.appendChild(p);
    document.body.appendChild(hold);
    return { p: p, remove: function () { hold.remove(); } };
  }

  // پشتێ یاریگەها شین (وەکی تیروپشکا سەر شاشێ)
  function field(W, H) {
    var st = stage(W, H, "poster bracket-frame");
    var wv = el("div", "waves");
    ["w1", "w2", "w3"].forEach(function (c) { wv.appendChild(el("i", c)); });
    st.p.appendChild(wv);
    return st;
  }

  function addLogo(p, size, x, y) {
    var src = logoData();
    if (!src) return;
    var img = el("img", "poster-logo");
    img.src = src;
    img.alt = "";
    img.style.cssText = "width:" + size + "px;height:" + size + "px;left:" + x + "px;top:" + y + "px";
    p.appendChild(img);
  }

  // «ژێر سەرپەرشتیا: مامۆستا کــڤان خـالـد»
  function supPill() {
    return el("div", "sup-pill", S().exportSupervisor || "ژێر سەرپەرشتیا: مامۆستا کــڤان خـالـد");
  }

  // دوماهیا وێنەی: هێڵا زێڕین ب ئەلماس، «بەرهەڤکرن و ئامادەکرن: Niwar Majeed» و مافێ پەیمانگەهێ
  function credit(cls) {
    var c = el("div", "credit " + (cls || ""));
    var dv = el("div", "cr-divider");
    dv.appendChild(el("span"));
    c.appendChild(dv);
    var row = el("div", "cr-row");
    row.appendChild(el("span", "cr-lbl", S().creditLabel || "بەرهەڤکرن و ئامادەکرن:"));
    var nm = el("span", "cr-name", S().creditName || "Niwar Majeed");
    nm.dir = "ltr";
    row.appendChild(nm);
    row.appendChild(el("span", "cr-sep", "·"));
    row.appendChild(el("span", "cr-copy", S().footer || "پەیمانگەها میتان © 2026"));
    c.appendChild(row);
    return c;
  }

  function addFoot(p, size) {
    var f = credit("poster-foot");
    f.style.fontSize = size + "px";
    p.appendChild(f);
  }

  // ---------- 1) تیروپشک — وێنەیێ مەزن 16:9 (3840×2160) ----------
  function posterBig() {
    var W = POSTER.W, H = POSTER.H, st = field(W, H), p = st.p;
    addLogo(p, 132, 40, 30);
    var bw = 1500, wb = el("div", "b-welcome poster-banner");
    wb.style.cssText = "left:" + (W - bw) / 2 + "px;top:26px;width:" + bw + "px;height:186px";
    if (S().drawTitle) wb.appendChild(el("div", "bw-title", S().drawTitle));
    var dv = el("div", "bw-divider");
    dv.appendChild(el("span"));
    wb.appendChild(dv);
    if (S().drawWelcome) wb.appendChild(el("div", "bw-text", S().drawWelcome));
    p.appendChild(wb);
    var sp = supPill();
    sp.classList.add("poster-sup");
    p.appendChild(sp);
    var board = el("div");
    p.appendChild(board);
    var sz = window.MITAN_BRACKET.drawExport(board, C_POSTER, "both", "poster-board");
    board.style.left = (W - sz.w) / 2 + "px";
    board.style.top = "240px";
    addFoot(p, 26);
    return shoot(p, "mitan-tirupishk-16x9.png", {
      ratio: POSTER.RATIO, cleanup: st.remove,
      before: function () { window.MITAN_BRACKET.fitNames(board, 24); }
    });
  }

  // ---------- 2) تیروپشک بۆ مۆبایلێ — دوو وێنەیێن 4:5 (2160×2700) ----------
  function posterHalf(side) {
    var W = F.W, H = F.H, st = field(W, H), p = st.p;
    addLogo(p, 96, 26, 24);
    var head = el("div", "half-head");
    head.appendChild(el("div", "half-title", S().drawTitle || S().institute || ""));
    head.appendChild(el("div", "half-pill", side === "left" ? "تیروپشک — لایێ چەپێ" : "تیروپشک — لایێ ڕاستێ"));
    head.appendChild(supPill());
    p.appendChild(head);
    var board = el("div");
    p.appendChild(board);
    var sz = window.MITAN_BRACKET.drawExport(board, C_HALF, side, "poster-board half-board");
    board.style.left = (W - sz.w) / 2 + "px";
    // د ستۆریێ دا تیروپشک د ناڤەڕاستا جهێ مایی دا
    board.style.top = Math.max(250, 250 + (H - 250 - 80 - sz.h) / 2) + "px";
    addFoot(p, 22);
    var name = named(side === "left" ? "mitan-tirupishk-mobile-1-chep.png" : "mitan-tirupishk-mobile-2-rast.png");
    return shoot(p, name, {
      ratio: PORTRAIT.RATIO, cleanup: st.remove,
      before: function () { window.MITAN_BRACKET.fitNames(board, 22); }
    });
  }

  // ---------- کارتا ستوونی (4:5) بۆ لیست، ڕۆژ، ئەنجام و خشتە ----------
  // grow: وێنە ب درێژی دگەل ناڤەڕۆکێ مەزن دبیت (بۆ خشتەیا تیمان)، ل جهێ بچووککرنێ
  // day: وێنەیێ ڕۆژەکێ (هەمی تشت د ناڤەڕاستێ دا، و پەیام ل ژێر یاریان)
  function portraitCard(badge, sub, nodes, extraCls, grow, day) {
    var st = stage(F.W, F.H, "share-card portrait fmt" + (F.tag || "-post") + " " + (extraCls || "") + (day ? " day-layout" : ""));
    var card = st.p;
    var head = el("div", "share-head");
    var src = logoData();
    if (src) { var img = el("img", "share-logo"); img.src = src; img.alt = ""; head.appendChild(img); }
    var tt = el("div", "share-titles");
    tt.appendChild(el("div", "share-title", (day && S().dayTitle) || S().drawTitle || S().institute || ""));
    if (S().subtitle) tt.appendChild(el("div", "share-sub", S().subtitle));
    tt.appendChild(supPill());
    head.appendChild(tt);
    card.appendChild(head);
    var bar = el("div", "share-badge");
    bar.appendChild(el("span", "sb-main", badge));
    if (sub) bar.appendChild(el("span", "sb-sub", sub));
    card.appendChild(bar);
    var body = el("div", "share-body");
    var inner = el("div", "share-inner" + (nodes.length === 1 ? " single" : ""));
    nodes.forEach(function (n) { inner.appendChild(n); });
    if (day && day.note) inner.appendChild(el("div", "day-msg day-note", day.note));
    if (day && day.msg) inner.appendChild(day.msg);
    body.appendChild(inner);
    if (day) {
      // ڕۆژ، یاری و پەیام پێکڤە د ناڤەڕاستا جهێ مایی دا
      var mid = el("div", "day-mid");
      mid.appendChild(bar);
      mid.appendChild(body);
      card.appendChild(mid);
    } else card.appendChild(body);
    card.appendChild(credit("share-foot"));
    // ئەگەر ناڤەڕۆک زێدە بیت، ب تەمامی بچووک دبیت دا کو د وێنەی دا جه بگریت (بێ بڕین)
    function fitBody() {
      inner.style.transform = "";
      // ستۆری: خشتە ب تەمامی د 9:16 دا جه دگریت (بچووک دبیت، نە درێژ)
      if (grow && F !== FORMATS.post) {
        body.style.justifyContent = "flex-start";
        var zb = 1;
        inner.style.zoom = "";
        while (inner.scrollHeight * zb > body.clientHeight + 1 && zb > 0.4) { zb -= 0.02; inner.style.zoom = zb; }
        body.style.justifyContent = "center";
        return;
      }
      if (grow) {
        card.style.height = "auto";
        var h = Math.max(F.H, Math.ceil(card.scrollHeight));
        card.style.height = h + "px";
        body.style.justifyContent = "center";
        return;
      }
      if (day) {
        // ئەگەر ڕۆژ، یاری و پەیام جه نەگرن، هەمی پێکڤە کێمەک بچووک دبن (بێ بڕین و بێ کەفتنا ل سەر سەری)
        var mid = card.querySelector(".day-mid"), z = 1;
        mid.style.zoom = "";
        while (mid.scrollHeight > mid.clientHeight + 1 && z > 0.6) { z -= 0.02; mid.style.zoom = z; }
        // ستۆری: ئەگەر جهێ ڤالا زۆر بیت، کارت و پەیام مەزنتر دبن دا کو وێنە پڕ بیت
        if (F === FORMATS.story) {
          // نە زێدەتر ژ 1.12، دا کو ناڤ ل سەر دوو ڕێزان نەچن
          while (z < 1.12) {
            mid.style.zoom = z + 0.02;
            var wrapped = [].some.call(mid.querySelectorAll(".team-name, .res-name"), function (n) { return n.offsetHeight > parseFloat(getComputedStyle(n).fontSize) * 1.6; });
            if (mid.scrollHeight > mid.clientHeight + 1 || wrapped) { mid.style.zoom = z; break; }
            z += 0.02;
          }
        }
        return;
      }
      var avail = body.clientHeight, need = inner.scrollHeight;
      if (need <= avail) { body.style.justifyContent = "center"; return; }
      body.style.justifyContent = "flex-start";
      inner.style.transform = "scale(" + (avail / need) + ")";
    }
    return { card: card, remove: st.remove, fit: fitBody };
  }

  // ---------- 3) لیستا یاریان (2160×2700) ----------
  function teamCell(id, ph, cls) {
    var t = id && typeof TEAMS !== "undefined" && TEAMS[id];
    var c = el("span", "ml-t " + cls + (t ? "" : " tbd"));
    var img = null;
    if (t && t.logo) { img = el("img", "ml-logo"); img.src = t.logo; img.alt = ""; }
    else img = el("span", "ml-logo ph", t ? String(id) : "؟");
    var nm = el("span", "ml-name", t ? t.name : (ph || "؟"));
    nm.dir = "auto";
    if (cls === "home") { c.appendChild(img); c.appendChild(nm); } else { c.appendChild(nm); c.appendChild(img); }
    return c;
  }

  function parsePair(v) {
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(String(v || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }));
    return r ? [+r[1], +r[2]] : null;
  }

  function matchList() {
    var RO = window.LEAGUE_ROUND_OF || [];
    var M = (window.LEAGUE_MATCHES || []).slice().sort(function (x, y) {
      return ((RO[x.no - 1] || 0) - (RO[y.no - 1] || 0)) || (x.no - y.no);
    });
    var nodes = [], lastRound = null;
    M.forEach(function (m) {
      var round = m.final ? "🏆 فاینەل" : m.round;
      if (round !== lastRound) { nodes.push(el("div", "ml-stage", round)); lastRound = round; }
      var row = el("div", "ml-row" + (m.final ? " final" : "") + (m.winner ? " done" : ""));
      row.appendChild(el("span", "ml-no", "یاریا " + m.no));
      row.appendChild(teamCell(m.home, m.homePh, "home"));
      var mid = el("span", "ml-mid");
      var g = parsePair(m.result);
      if (g) {
        mid.appendChild(el("b", null, g[0]));
        mid.appendChild(el("i", null, "-"));
        mid.appendChild(el("b", null, g[1]));
        mid.classList.add("score");
      } else mid.textContent = "VS";
      row.appendChild(mid);
      row.appendChild(teamCell(m.away, m.awayPh, "away"));
      var when = "دێ پاشی هێتە دیارکرن";
      if (m.date) {
        var p = m.date.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
        when = pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + (m.time ? " · " + m.time.replace(/\s*ئێڤاری/, "") : "");
      }
      row.appendChild(el("span", "ml-when", when));
      nodes.push(row);
    });
    var pc = portraitCard("لیستا یاریان", "18 یاری · ژ قوناغا ئێکێ هەتا فاینەلێ", nodes, "list-card");
    return shoot(pc.card, named("mitan-lista-yarian.png"), { ratio: PORTRAIT.RATIO, cleanup: pc.remove, before: pc.fit });
  }

  // ---------- مێنیویا «📷 وێنە»: هەلبژارتنا جۆر و قەبارێ وێنەی ----------
  // items: [{ title, sub, fmt, job }] — fmt: "post" / "story" / "square" (یان نە، بۆ وێنەیێ 16:9)
  var menu = null, menuBtn = null;
  function closeMenu() { if (menu) { menu.remove(); menu = null; menuBtn = null; } }
  function withFmt(key, job) {
    return function () { F = FORMATS[key] || FORMATS.post; return Promise.resolve(job()).then(function (v) { F = FORMATS.post; return v; }, function (e) { F = FORMATS.post; throw e; }); };
  }
  function openMenu(btn, title, items) {
    if (menu) { var same = menuBtn === btn; closeMenu(); if (same) return; }
    menuBtn = btn;
    menu = el("div", "shot-menu floating");
    if (title) menu.appendChild(el("div", "shot-head", title));
    items.forEach(function (it) {
      var b = el("button", "shot-item");
      b.type = "button";
      b.appendChild(el("span", "si-main", it.title));
      if (it.sub) b.appendChild(el("span", "si-sub", it.sub));
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        closeMenu();
        run(it.fmt ? withFmt(it.fmt, it.job) : it.job);
      });
      menu.appendChild(b);
    });
    (document.fullscreenElement || document.body).appendChild(menu);
    // ل نک دوگمەیێ، و هەمیشە د ناڤ شاشێ دا
    var r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
    var left = Math.min(Math.max(8, r.right - mw), window.innerWidth - mw - 8);
    var top = r.bottom + 8;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 8);
    menu.style.left = left + "px";
    menu.style.top = top + "px";
  }
  document.addEventListener("click", function (e) {
    if (menu && !menu.contains(e.target) && !(menuBtn && menuBtn.contains(e.target))) closeMenu();
  });
  window.addEventListener("scroll", closeMenu, true);
  window.addEventListener("resize", closeMenu);

  function sizeItems(keys, job) {
    return keys.map(function (k) {
      var f = FORMATS[k];
      return { title: f.label, sub: (f.W * PORTRAIT.RATIO) + " × " + (f.H * PORTRAIT.RATIO) + " px", fmt: k, job: job };
    });
  }

  // ---------- تیروپشک — ستۆری (9:16)، ئێک وێنە ب قەبارێن زیرەک ----------
  // وەکی ستۆریا پەیجا پەیمانگەهێ: لایێ چەپێ (1–9) ل چەپێ، لایێ ڕاستێ (10–19) ل ڕاستێ، کوپ و فاینەل ل ناڤەڕاستێ.
  // ب خۆ ژ RESULTS: یاریێن داهاتی (هەردوو تیم دیار، بێ ئەنجام) مەزن و ڕۆهن، یاریێن کرین بچووک،
  // خانێن ڤالا بچووک و تاری. خانێن سەرکەفتیان د ناڤبەرا ڕێزێن تیمان دا جه دگرن دا کو جهـ بەس بیت.
  var SO = { W: 1080, H: 1920, M: 24, TOP: 384, BOT: 1688, STEP: 34, PAD: 3 };
  var SO_DAYS = ["یەکشەمب", "دووشەمب", "سێشەمب", "چارشەمب", "پێنجشەمب", "ئەینی", "شەمبی"];

  function soLost(id) {
    return (window.LEAGUE_MATCHES || []).some(function (m) { return m.winner && (m.home === id || m.away === id) && m.winner !== id; });
  }
  function soUp(m) { return !!(m && m.home && m.away && !m.winner); }

  // دروستکرنا هەمی خانان (بەری وێنە، دا کو لوگۆ وەکی داتا بهێنە ئامادەکرن)
  function soBuild(p) {
    var PATH = window.LEAGUE_PATH, MS = window.LEAGUE_MATCHES || [], FINAL = PATH.length, fp = PATH[FINAL - 1];
    var fm = MS[FINAL - 1] || {};
    var tk = window.LEAGUE_TIME_KEY || function () { return 0; };
    var nextNo = null, nextKey = null;
    MS.forEach(function (m) {
      if (!soUp(m)) return;
      var k = (m.date || "9999-99-99") + String(10000 + tk(m.time));
      if (nextKey === null || k < nextKey) { nextKey = k; nextNo = m.no; }
    });
    function tree(no, leaves, nodes, parent) {
      var n = { no: no, m: MS[no - 1] || {}, parent: parent };
      n.kids = PATH[no - 1].map(function (r) {
        if (typeof r === "number") {
          var l = { leaf: true, num: r, team: TEAMS[r] ? r : null, d: 0, idx: leaves.length, parent: n };
          leaves.push(l);
          return l;
        }
        return tree(+String(r).slice(1), leaves, nodes, n);
      });
      n.d = 1 + Math.max(n.kids[0].d, n.kids[1].d);
      n.team = n.m.winner || null;
      nodes.push(n);
      return n;
    }
    var finalNode = { m: fm, no: FINAL };
    var halves = [{ side: "l" }, { side: "r" }];
    halves.forEach(function (h, i) {
      h.leaves = []; h.nodes = [];
      h.root = tree(+String(fp[i]).slice(1), h.leaves, h.nodes, finalNode);
    });
    function mk(n, side) {
      var t = n.team && TEAMS[n.team] ? TEAMS[n.team] : null;
      var out = !!(n.team && soLost(n.team));
      var up = !!(n.parent && soUp(n.parent.m));
      var cls = (n.leaf ? "so-slot " : "so-box ") + side + (out ? " out" : up ? " up" : t ? " filled" : " empty");
      if (!n.leaf && soUp(n.m)) cls += " match-up";
      var e = el("div", cls);
      if (n.leaf) e.appendChild(el("span", "so-num", n.num));
      if (t || n.leaf) {
        if (t && t.logo) { var im = el("img", "so-logo"); im.src = t.logo; im.alt = ""; e.appendChild(im); }
        else e.appendChild(el("span", "so-logo ph", n.leaf ? n.num : "؟"));
        var nm = el("span", "so-name", t ? t.name : "تیم " + n.num);
        nm.dir = "auto";
        e.appendChild(nm);
        if (out) e.appendChild(el("span", "so-out", "دەرکەفت"));
      }
      if (!n.leaf && !t && soUp(n.m)) {
        // یاریا داهاتی: ژمارە، ڕۆژ و دەمژمێر د ناڤ خانا یاریێ دا
        if (n.no === nextNo) e.appendChild(el("span", "so-next", "⏳ یاریا داهاتی"));
        e.appendChild(el("span", "so-mno", "یاریا " + n.no));
        var mm = n.m;
        if (mm.date) {
          var q = mm.date.split("-"), dd = new Date(+q[0], +q[1] - 1, +q[2]);
          e.appendChild(el("span", "so-mwhen", SO_DAYS[dd.getDay()] + " " + q[2] + "/" + q[1]));
          if (mm.time) e.appendChild(el("span", "so-mtime", mm.time));
        }
      }
      if (!n.leaf) {
        e.appendChild(el("span", "so-no", n.no));
        var g = parsePair(n.m.result);
        if (g) {
          var sc = el("span", "so-score", g[0] + " - " + g[1] + (n.m.pens ? "  (پ " + n.m.pens + ")" : ""));
          sc.dir = "ltr";
          e.appendChild(sc);
          n.hasScore = true;
        }
      }
      e.style.left = "-4000px";
      e.style.top = "0px";
      p.appendChild(e);
      n.el = e;
    }
    halves.forEach(function (h) { h.leaves.forEach(function (l) { mk(l, h.side); }); h.nodes.forEach(function (n) { mk(n, h.side); }); });

    // فاینەل، کوپ و نیشانێن یاریێن داهاتی
    var fin = el("div", "so-final" + (fm.winner ? " crowned" : ""));
    var ct = fm.winner && TEAMS[fm.winner];
    if (ct) {
      if (ct.logo) { var ci = el("img"); ci.src = ct.logo; ci.alt = ""; fin.appendChild(ci); }
      var cn = el("span", "so-fname", ct.name); cn.dir = "auto"; fin.appendChild(cn);
    } else fin.appendChild(el("span", "so-fph", "🏆 پاڵەوان"));
    fin.appendChild(el("span", "so-no", FINAL));
    fin.style.left = "-4000px";
    p.appendChild(fin);
    var flab = el("div", "so-flabel", "فاینەل");
    flab.style.left = "-4000px";
    p.appendChild(flab);
    var cup = document.querySelector(".hero .trophy"), troph = null;
    if (cup) { troph = cup.cloneNode(true); troph.setAttribute("class", "so-trophy"); troph.style.left = "-4000px"; p.appendChild(troph); }
    var pills = [];
    function pill(m, node) {
      var e = el("div", "so-pill" + (m.no === nextNo ? " next" : ""));
      if (m.no === nextNo) e.appendChild(el("div", "so-next", "⏳ یاریا داهاتی"));
      var when = "";
      if (m.date) {
        var q = m.date.split("-"), d = new Date(+q[0], +q[1] - 1, +q[2]);
        when = " · " + SO_DAYS[d.getDay()] + " " + q[2] + "/" + q[1] + (m.time ? " · " + m.time.replace(/\s*ئێڤاری/, "") : "");
      }
      e.appendChild(el("div", "so-when", "یاریا " + m.no + when));
      e.style.left = "-4000px";
      p.appendChild(e);
      pills.push({ el: e, node: node });
    }
    if (soUp(fm)) pill(fm, "final");
    return { halves: halves, fin: fin, flab: flab, troph: troph, pills: pills, fm: fm };
  }

  // جهـ و قەبارە (پشتی فۆنت ئامادە بوون)
  function soPlace(p, c) {
    var W = SO.W, M = SO.M, TOP = SO.TOP, BOT = SO.BOT, STEP = SO.STEP, PAD = SO.PAD;
    var placed = [], rep = { overlaps: 0 };
    function hit(r) {
      for (var i = 0; i < placed.length; i++) {
        var q = placed[i];
        if (r.x < q.x + q.w + PAD && q.x < r.x + r.w + PAD && r.y < q.y + q.h + PAD && q.y < r.y + r.h + PAD) return true;
      }
      return false;
    }
    function pos(e, x, y) { e.style.left = x + "px"; e.style.top = y + "px"; }
    function fitName(e, min) {
      var nm = e.querySelector(".so-name");
      if (!nm) return;
      var f = parseFloat(getComputedStyle(nm).fontSize);
      while (nm.scrollWidth > nm.clientWidth + 1 && f > min) { f--; nm.style.fontSize = f + "px"; }
    }
    var H2 = c.halves, rows = Math.max(H2[0].leaves.length, H2[1].leaves.length), pitch = (BOT - TOP) / rows;

    // خانێن تیمان: ئێک پانی بۆ هەمیان، ل لێڤێن هەردوو لایان
    var SW = 0;
    H2.forEach(function (h) { h.leaves.forEach(function (l) { SW = Math.max(SW, l.el.offsetWidth); }); });
    SW = Math.min(SW, 266);
    H2.forEach(function (h) {
      var off = (rows - h.leaves.length) / 2;
      h.leaves.forEach(function (l) {
        l.el.style.width = SW + "px";
        fitName(l.el, l.el.classList.contains("out") ? 20 : 26);
        var eh = l.el.offsetHeight;
        l.y = TOP + (l.idx + 0.5 + off) * pitch;
        l.inner = M + SW;
        var r = { x: h.side === "l" ? M : W - M - SW, y: l.y - eh / 2, w: SW, h: eh };
        pos(l.el, r.x, r.y);
        placed.push(r);
      });
    });

    // خانێن یاریان: ژ قوناغا ئێکێ بەرەف ناڤەڕاستێ. هەر خانەک د ناڤبەرا تیمێن خۆ دا جهەکێ ڤالا دبینیت.
    var all = [];
    H2.forEach(function (h) { h.nodes.forEach(function (n) { n.side = h.side; all.push(n); }); });
    all.sort(function (a, b) { return a.d - b.d; });
    var LIMIT = W / 2 - 16;
    function rectFor(side, inner, w, eh, extra, y) {
      return { x: side === "l" ? inner - w : W - inner, y: y - (eh + extra) / 2, w: w, h: eh + extra };
    }
    all.forEach(function (n) {
      var e = n.el, extra = n.hasScore ? 6 : 0;
      var ys0 = n.kids.map(function (k) { return k.y; });
      var ymin = Math.min(ys0[0], ys0[1]), ymax = Math.max(ys0[0], ys0[1]), mid = (ymin + ymax) / 2;
      var ys = [mid];
      for (var k = 0; k <= rows; k++) { var gy = TOP + k * pitch; if (gy > ymin + 4 && gy < ymax - 4) ys.push(gy); }
      ys.sort(function (a, b) { return Math.abs(a - mid) - Math.abs(b - mid); });
      var base = Math.max(n.kids[0].inner, n.kids[1].inner) + STEP, done = null;
      for (var t = 0; t < 4 && !done; t++) {
        var w = e.offsetWidth, eh = e.offsetHeight;
        for (var inner = base; inner <= LIMIT && !done; inner += 6) {
          for (var j = 0; j < ys.length && !done; j++) {
            var r = rectFor(n.side, inner, w, eh, extra, ys[j]);
            if (!hit(r)) done = { r: r, inner: inner, y: ys[j] };
          }
        }
        if (!done) {
          var nm = e.querySelector(".so-name");
          if (!nm) break;
          nm.style.fontSize = (parseFloat(getComputedStyle(nm).fontSize) - 2) + "px";
        }
      }
      if (!done) {
        var i2 = Math.min(base, LIMIT);
        done = { r: rectFor(n.side, i2, e.offsetWidth, e.offsetHeight, extra, mid), inner: i2, y: mid };
        rep.overlaps++;
        (rep.failed = rep.failed || []).push(n.no);
      }
      n.inner = done.inner; n.y = done.y; n.rect = done.r;
      pos(e, done.r.x, done.r.y);
      placed.push(done.r);
    });

    // فاینەل ل ژێر نیڤ دوماهیکان، و کوپ ل سەر وان
    var semis = [H2[0].root, H2[1].root];
    var fw = c.fin.offsetWidth, fh = c.fin.offsetHeight, lh = c.flab.offsetHeight + 8;
    var fx = (W - fw) / 2, fy = Math.max(semis[0].rect.y + semis[0].rect.h, semis[1].rect.y + semis[1].rect.h) + 60;
    while (fy + fh + lh < BOT + 60 && hit({ x: fx, y: fy, w: fw, h: fh + lh })) fy += 8;
    pos(c.fin, fx, fy);
    placed.push({ x: fx, y: fy, w: fw, h: fh + lh });
    pos(c.flab, W / 2 - c.flab.offsetWidth / 2, fy + fh + 8);
    if (c.troph) {
      var tw = 104, th = 124, tx = (W - tw) / 2;
      var ty = Math.min(semis[0].rect.y, semis[1].rect.y) - th - 24;
      while (ty > TOP - 40 && hit({ x: tx, y: ty, w: tw, h: th })) ty -= 8;
      pos(c.troph, tx, ty);
      placed.push({ x: tx, y: ty, w: tw, h: th });
    }

    // هێڵ
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "so-lines");
    svg.setAttribute("width", W);
    svg.setAttribute("height", SO.H);
    function line(d, win) {
      var path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      if (win) path.setAttribute("class", "win");
      svg.appendChild(path);
    }
    all.forEach(function (n) {
      var l = n.side === "l";
      var jIn = Math.max(n.kids[0].inner, n.kids[1].inner) + 12, jx = l ? jIn : W - jIn;
      n.kids.forEach(function (k) {
        var kx = l ? k.inner : W - k.inner, d = "M" + kx + " " + k.y + " H" + jx + " V" + n.y;
        if (l && jx < n.rect.x) d += " H" + n.rect.x;
        if (!l && jx > n.rect.x + n.rect.w) d += " H" + (n.rect.x + n.rect.w);
        line(d, k.team && k.team === n.team);
      });
    });
    semis.forEach(function (sn) {
      var cx = sn.rect.x + sn.rect.w / 2, by = sn.rect.y + sn.rect.h;
      var tx2 = Math.min(Math.max(cx, fx + 20), fx + fw - 20);
      line("M" + cx + " " + by + " V" + (fy - 16) + " H" + tx2 + " V" + fy, sn.team && sn.team === c.fm.winner);
    });
    p.insertBefore(svg, p.querySelector(".so-slot"));

    // نیشانێن یاریێن داهاتی (ژمارە، ڕۆژ، دەمژمێر): جهەکێ ڤالا ل نک خانێ
    c.pills.forEach(function (pl) {
      var e = pl.el, pw = e.offsetWidth, ph = e.offsetHeight, cands = [];
      if (pl.node === "final") {
        cands = [{ x: (W - pw) / 2, y: fy + fh + lh + 6 }, { x: (W - pw) / 2, y: fy - ph - 10 }];
      } else {
        var r = pl.node.rect, l = pl.node.side === "l", cy = pl.node.y;
        var inX = l ? r.x + r.w + 8 : r.x - pw - 8;
        [0, -46, 46, -86, 86].forEach(function (dy) { cands.push({ x: inX, y: cy - ph / 2 + dy }); });
        cands.push({ x: l ? r.x : r.x + r.w - pw, y: r.y + r.h + 8 });
        cands.push({ x: l ? r.x : r.x + r.w - pw, y: r.y - ph - 8 });
      }
      var ok = null;
      for (var i = 0; i < cands.length && !ok; i++) {
        var q = { x: Math.max(8, Math.min(W - pw - 8, cands[i].x)), y: cands[i].y, w: pw, h: ph };
        if (!hit(q)) ok = q;
      }
      if (!ok) { ok = { x: Math.max(8, Math.min(W - pw - 8, cands[0].x)), y: cands[0].y, w: pw, h: ph }; rep.overlaps++; }
      pos(e, ok.x, ok.y);
      placed.push(ok);
    });

    // قەبارێن فۆنتی بۆ ڕاپۆرتێ
    rep.fonts = {};
    p.querySelectorAll(".so-slot, .so-box").forEach(function (e) {
      var nm = e.querySelector(".so-name");
      if (!nm) return;
      var k = (e.classList.contains("so-slot") ? "slot" : "box") + "-" + (["up", "out", "filled", "empty"].filter(function (x) { return e.classList.contains(x); })[0] || "normal");
      var f = Math.round(parseFloat(getComputedStyle(nm).fontSize));
      rep.fonts[k] = rep.fonts[k] ? [Math.min(rep.fonts[k][0], f), Math.max(rep.fonts[k][1], f)] : [f, f];
    });
    window.MITAN_STORY_REPORT = rep;
  }

  function posterStory() {
    var st = field(SO.W, SO.H), p = st.p;
    p.classList.add("story-one");
    p.appendChild(el("div", "so-glow"));
    addLogo(p, 104, (SO.W - 104) / 2, 52);
    var bw = 980, wb = el("div", "b-welcome poster-banner so-banner");
    wb.style.cssText = "left:" + (SO.W - bw) / 2 + "px;top:178px;width:" + bw + "px;height:128px";
    if (S().drawTitle) wb.appendChild(el("div", "bw-title", S().drawTitle));
    var dv = el("div", "bw-divider");
    dv.appendChild(el("span"));
    wb.appendChild(dv);
    if (S().drawWelcome) wb.appendChild(el("div", "bw-text", S().drawWelcome));
    p.appendChild(wb);
    var sp = supPill();
    sp.classList.add("so-sup");
    p.appendChild(sp);
    var ctx = soBuild(p);
    addFoot(p, 22);
    return shoot(p, "mitan-tirupishk-story.png", { ratio: 2, cleanup: st.remove, before: function () { soPlace(p, ctx); } });
  }

  function openDrawMenu() {
    var halves = function () { return posterHalf("left").then(function () { return posterHalf("right"); }); };
    openMenu(document.getElementById("shotBtn"), "📷 جۆر و قەبارێ وێنەی هەلبژێرە", [
      { title: "🖼 تیروپشک — وێنەیێ مەزن (16:9)", sub: "3840 × 2160 px · تی ڤی، کۆمپیوتەر، چاپ", job: posterBig },
      { title: "📲 تیروپشک — ستۆری (9:16)", sub: "2160 × 3840 px · هەمی تیروپشک د ئێک ستۆری دا", job: posterStory },
      { title: "📱 تیروپشک — 2 وێنە، پۆست (4:5)", sub: "2160 × 2700 px · ئینستاگرام / فەیسبووک", fmt: "post", job: halves },
      { title: "📋 لیستا یاریان — پۆست (4:5)", sub: "2160 × 2700 px", fmt: "post", job: matchList },
      { title: "📋 لیستا یاریان — ستۆری (9:16)", sub: "2160 × 3840 px", fmt: "story", job: matchList }
    ]);
  }

  function latin(s) {
    return String(s || "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
  }

  // ---------- 4) وێنەیێ ڕۆژەکێ (خشتە یان ئەنجام) — 2160×2700 ----------
  // kind: "roj" (خشتەیێ یاریان) یان "encam" (ئەنجام)
  // پەیاما ل ژێر یاریان ژ MESSAGES (data.js): {weekday} {date} {times} ب زێڕین
  function dayMessage(tpl, vals) {
    var box = el("div", "day-msg");
    String(tpl).split(/(\{\w+\})/).forEach(function (part) {
      var k = /^\{(\w+)\}$/.exec(part);
      if (k) { if (vals[k[1]]) box.appendChild(el("b", null, vals[k[1]])); }
      else if (part) box.appendChild(document.createTextNode(part));
    });
    return box;
  }

  // ---------- پۆستا تایبەت یا فاینەلێ (یاریا 18) ----------
  // ل دویف _reference/final-post.png. بەری فاینەلێ: «فاینەل»؛ پشتی ئەنجامێ: ناڤێ پاڵەوانی.
  var FP_DAYS = ["یەکشەمب", "دووشەمب", "سێشەمب", "چارشەمب", "پێنجشەمب", "ئەینی", "شەمبی"];
  function posterFinalMatch() {
    var MS = window.LEAGUE_MATCHES || [], no = (window.LEAGUE_PATH || []).length, m = MS[no - 1] || {};
    var story = F === FORMATS.story;
    var W = 1080, H = story ? 1920 : 1350;
    var st = stage(W, H, "fpost" + (story ? " story" : "")), p = st.p;
    var champ = m.winner && typeof TEAMS !== "undefined" ? TEAMS[m.winner] : null;

    p.appendChild(el("div", "fp-beam l"));
    p.appendChild(el("div", "fp-beam r"));
    p.appendChild(el("div", "fp-pitch"));
    // کاغەزێن ڕەنگین تنێ ل لێڤێن چەپ و ڕاست
    var seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 26; i++) {
      var c = el("i", "fp-conf" + (rnd() < .3 ? " blue" : ""));
      var left = rnd() < .5;
      c.style.cssText = (left ? "left:" : "right:") + Math.round(14 + rnd() * 70) + "px;top:" + Math.round(70 + rnd() * (H - 200)) + "px;transform:rotate(" + Math.round(rnd() * 180) + "deg)";
      p.appendChild(c);
    }
    p.appendChild(el("div", "fp-frame"));

    var col = el("div", "fp-col");
    var lg = logoData();
    if (lg) { var li = el("img", "fp-logo"); li.src = lg; li.alt = ""; col.appendChild(li); }
    col.appendChild(el("div", "fp-title", S().dayTitle || S().drawTitle || ""));
    col.appendChild(el("div", "fp-sup", S().exportSupervisor || ""));

    var tw = el("div", "fp-trophy");
    tw.appendChild(el("div", "fp-glow"));
    ["s1", "s2", "s3", "s4"].forEach(function (k) { tw.appendChild(el("span", "fp-spark " + k, "✦")); });
    var cup = document.querySelector(".hero .trophy");
    if (cup) { var cc = cup.cloneNode(true); cc.setAttribute("class", "fp-cup"); tw.appendChild(cc); }
    tw.appendChild(el("div", "fp-year", "2026"));
    col.appendChild(tw);

    col.appendChild(el("div", "fp-ribbon", champ ? "🏆 پاڵەوانێ قارەمانیێ" : "⭐ یاریا دوماهیێ یا قارەمانیێ ⭐"));
    var big = el("div", "fp-big" + (champ ? " champ" : ""), champ ? champ.name : "فاینەل");
    big.dir = "auto";
    col.appendChild(big);
    if (!champ) col.appendChild(el("div", "fp-ask", "کێ دێ کوپا قارەمانیێ بلند کەت؟ 🏆"));

    // کارتا یاریێ: لایێ ڕاستێ تیما ئێکێ، لایێ چەپێ تیما دووێ
    var card = el("div", "fp-card");
    function side(id, ph) {
      var t = id && typeof TEAMS !== "undefined" ? TEAMS[id] : null, s = el("div", "fp-team" + (champ && id === m.winner ? " win" : champ ? " lose" : ""));
      var b = el("div", "fp-badge");
      if (champ && id === m.winner) b.appendChild(el("span", "fp-crown", "👑"));
      if (t && t.logo) { var im = el("img", "fp-tlogo"); im.src = t.logo; im.alt = ""; b.appendChild(im); }
      else b.appendChild(el("div", "fp-tlogo ph", "؟"));
      s.appendChild(b);
      var n = el("div", "fp-tname" + (t ? "" : " tbd"), t ? t.name : (ph || "؟"));
      n.dir = "auto";
      s.appendChild(n);
      return s;
    }
    card.appendChild(side(m.home, m.homePh));
    var vs = el("div", "fp-vswrap");
    var g = parsePair(m.result);
    if (g) {
      var sc = el("div", "fp-vs score", g[0] + " - " + g[1]);
      sc.dir = "ltr";
      vs.appendChild(sc);
      var pp = parsePair(m.pens);
      if (pp) { var pe = el("div", "fp-pens", "پێناڵتی "); var pn = el("span", null, pp[0] + " - " + pp[1]); pn.dir = "ltr"; pe.appendChild(pn); vs.appendChild(pe); }
    } else vs.appendChild(el("div", "fp-vs", "VS"));
    card.appendChild(vs);
    card.appendChild(side(m.away, m.awayPh));
    col.appendChild(card);

    var dp = el("div", "fp-date");
    if (m.date) {
      var q = m.date.split("-"), d = new Date(+q[0], +q[1] - 1, +q[2]);
      dp.appendChild(document.createTextNode(FP_DAYS[d.getDay()] + " · "));
      dp.appendChild(el("b", null, q[2] + "/" + q[1] + "/" + q[0]));
      dp.appendChild(document.createTextNode(" · دەمژمێر "));
      dp.appendChild(el("b", null, (m.time || "").replace(/\s*ئێڤاری\s*/, "")));
      dp.appendChild(document.createTextNode(" ئێڤاری"));
    } else dp.textContent = "ڕێکەفت: دێ پاشی هێتە دیارکرن";
    col.appendChild(dp);

    var msg = el("div", "fp-msg");
    if (champ) {
      msg.appendChild(document.createTextNode("پیرۆز بیت ل "));
      var cn = el("b", null, champ.name); cn.dir = "auto"; msg.appendChild(cn);
      msg.appendChild(document.createTextNode("! 🎉"));
    } else {
      msg.appendChild(document.createTextNode("داخوازا سەرکەفتنێ بۆ "));
      msg.appendChild(el("b", null, "هەردوو تیمان"));
      msg.appendChild(document.createTextNode(" دکەین ⚽"));
    }
    col.appendChild(msg);
    var foot = credit("fp-foot");
    col.appendChild(foot);
    p.appendChild(col);

    function fit() {
      // ناڤێ پاڵەوانی ل سەر ئێک ڕێز
      var f = parseFloat(getComputedStyle(big).fontSize);
      while (big.scrollWidth > big.clientWidth + 1 && f > 60) { f -= 2; big.style.fontSize = f + "px"; }
      [].forEach.call(p.querySelectorAll(".fp-tname"), function (n) {
        var s = parseFloat(getComputedStyle(n).fontSize);
        while (n.scrollWidth > n.clientWidth + 1 && s > 26) { s -= 2; n.style.fontSize = s + "px"; }
      });
      // ستۆری: هەمی تشت مەزنتر دا کو 9:16 پڕ ببیت، پاشی بچووک دبیت ئەگەر جه نەگریت
      var z = story ? 1.32 : 1;
      col.style.zoom = z;
      while (col.scrollHeight > col.clientHeight + 1 && z > .6) { z -= .02; col.style.zoom = z; }
    }
    var file = (champ ? "mitan-faynal-palewan" : "mitan-faynal") + (story ? "-story" : "") + ".png";
    return shoot(p, file, { ratio: 2, cleanup: st.remove, before: fit });
  }

  function dayButton(head, sec, kind) {
    var b = el("button", "shot-btn", "📷 وێنە");
    b.type = "button";
    b.title = "دابەزاندنا وێنەیێ ڤێ ڕۆژێ";
    b.addEventListener("click", function () {
      var num = (head.querySelector(".day-num") || {}).textContent || "";
      var dt = (head.querySelector(".day-date") || {}).textContent || "";
      var dn = (head.querySelector(".day-name") || {}).textContent || "";
      var final = /فاینەل/.test(num);
      var n = (latin(num).match(/\d+/) || [""])[0];
      var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(dt);
      var iso = m ? m[3] + "-" + m[2] + "-" + m[1] : "";
      var name = "mitan-" + (kind === "encam" ? "encam-" : "") + (final ? "roj-faynal" : "roj-" + n + (iso ? "-" + iso : "")) + ".png";
      var badge = (kind === "encam" ? "ئەنجامێن " : "") + (final ? "🏆 فاینەل" : "ڕۆژا " + n);
      var sub = final && !m ? "ڕێکەفت: دێ پاشی هێتە دیارکرن" : [dn, dt].filter(Boolean).join(" · ");
      var cards = Array.prototype.map.call(sec.querySelectorAll(":scope > article"), function (a) { return a.cloneNode(true); });
      // دەمژمێرێن یاریان، بێ «ئێڤاری» (پەیام ب خۆ «ئێڤاری» دنڤیسیت)
      var times = [];
      cards.forEach(function (c) {
        var t = c.querySelector(".time:not(.tba)");
        var v = t ? t.textContent.replace(/\s*ئێڤاری\s*/, "").trim() : "";
        if (v && times.indexOf(v) < 0) times.push(v);
      });
      var M = typeof MESSAGES !== "undefined" ? MESSAGES : {};
      var tpl = kind === "encam" ? M.results
              : final ? (m ? M.final : M.finalTba)
              : cards.length === 1 ? M.dayOne : M.dayMany;
      var msg = tpl ? dayMessage(tpl, { weekday: dn, date: dt, times: times.join(" و ") }) : null;
      // ڕۆژا فاینەلێ: پۆستا تایبەت یا فاینەلێ ل سەری مێنیویێ
      var hasFinal = cards.some(function (c) { return c.classList.contains("final"); });
      var extra = hasFinal ? [
        { title: "🏆 پۆستا فاینەلێ (4:5)", sub: "2160 × 2700 px", fmt: "post", job: posterFinalMatch },
        { title: "🏆 فاینەل — ستۆری (9:16)", sub: "2160 × 3840 px", fmt: "story", job: posterFinalMatch }
      ] : [];
      openMenu(b, "📷 قەبارێ وێنەی هەلبژێرە", extra.concat(sizeItems(["post", "story", "square"], function () {
        // هەر جار کۆپیەکا نوو یا کارتان و پەیامێ (دا کو چەند جاران بهێتە دابەزاندن)
        var cs = cards.map(function (c) { return c.cloneNode(true); });
        var pc = portraitCard(badge, sub, cs, "day-card", false, { msg: msg ? msg.cloneNode(true) : null, note: typeof DAY_NOTES !== "undefined" && iso ? DAY_NOTES[iso] : null });
        return shoot(pc.card, named(name), { ratio: PORTRAIT.RATIO, cleanup: pc.remove, before: pc.fit });
      })));
    });
    return b;
  }

  // ---------- 5) خشتەیا تیمان — 2160×2700 ----------
  function shootTable(e) {
    if (e) e.stopPropagation();
    var wrap = document.querySelector("#results .table-wrap");
    if (!wrap) return;
    // خشتە 19 ڕێزن: تنێ پۆست و ستۆری (د چوارگۆشێ دا جه ناگرن)
    openMenu(document.getElementById("shotTable"), "📷 قەبارێ وێنەی هەلبژێرە", sizeItems(["post", "story"], function () {
      var nodes = [wrap.cloneNode(true)];
      var note = document.querySelector("#results .table-note");
      if (note) nodes.push(note.cloneNode(true));
      var pc = portraitCard("خشتەیا تیمان", "", nodes, "table-card", true);
      return shoot(pc.card, named("mitan-xishte.png"), { ratio: PORTRAIT.RATIO, cleanup: pc.remove, before: pc.fit });
    }));
  }

  // ---------- 6) گۆلکەر — باشترین 10 ----------
  function shootScorers(e) {
    if (e) e.stopPropagation();
    var SC = window.MITAN_SCORERS;
    if (!SC) return;
    openMenu(document.getElementById("shotScorers"), "📷 قەبارێ وێنەی هەلبژێرە", sizeItems(["post", "story"], function () {
      var r = SC.compute();
      var nodes = [SC.buildTable(r.list)];
      // پانیا تەمام بێ بچووککرن: پۆست ب درێژی مەزن دبیت (کێمترین 2700)، ستۆری د 3840 دا جه دگریت
      var ti = SC.titleInfo ? SC.titleInfo() : { title: "گۆلکەرێن قارەمانیێ تا نوکە", progress: "" };
      var pc = portraitCard((ti.done ? "" : "⚽ ") + ti.title, ti.progress, nodes, "table-card scorers-card", true);
      return shoot(pc.card, named("mitan-golker.png"), { ratio: PORTRAIT.RATIO, cleanup: pc.remove, before: pc.fit });
    }));
  }

  // ---------- 7) گۆلچی ----------
  function shootKeepers(e) {
    if (e) e.stopPropagation();
    var GK = window.MITAN_KEEPERS;
    if (!GK) return;
    openMenu(document.getElementById("shotKeepers"), "📷 قەبارێ وێنەی هەلبژێرە", sizeItems(["post", "story"], function () {
      var nodes = [GK.buildTable(GK.compute().list)];
      var pc = portraitCard("🧤 باشترین گۆلچیێ قارەمانیێ", "", nodes, "table-card scorers-card keepers-card", true);
      return shoot(pc.card, named("mitan-golchi.png"), { ratio: PORTRAIT.RATIO, cleanup: pc.remove, before: pc.fit });
    }));
  }

  function bind(id, fn) { var b = document.getElementById(id); if (b) b.addEventListener("click", fn); }
  bind("shotScorers", shootScorers);
  bind("shotKeepers", shootKeepers);
  bind("shotBtn", function (e) { e.stopPropagation(); openDrawMenu(); });
  bind("shotTable", shootTable);

  window.MITAN_SHARE = { dayButton: dayButton, shoot: shoot, toast: toast,
                         posterBig: posterBig, posterHalf: posterHalf, matchList: matchList,
                         withFmt: withFmt, run: run };
})();
