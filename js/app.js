/* app.js — ڤی فایلی دەستکاری نەکە. هەمی داتا د data.js دا نە. */
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

  function parseDate(s) {
    var p = String(s).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // ph: نڤیسینا ل جهێ تیمێ هێشتا نەدیار، وەکی «سەرکەفتیێ یاریا 9»
  function teamBlock(id, ph) {
    var t = (id && typeof TEAMS !== "undefined" && TEAMS[id]) || null;
    var box = el("div", "team" + (t ? "" : " tbd"));
    if (!t) {
      box.appendChild(el("div", "logo-ph", "؟"));
      box.appendChild(el("div", "team-name", ph || "؟"));
      return box;
    }
    if (t.logo) {
      var img = el("img", "logo");
      img.src = t.logo;
      img.alt = t.name;
      img.onerror = function () {
        var ph2 = el("div", "logo-ph", id);
        img.replaceWith(ph2);
      };
      box.appendChild(img);
    } else {
      box.appendChild(el("div", "logo-ph", id));
    }
    var nm = el("div", "team-name", t.name);
    nm.dir = "auto";
    box.appendChild(nm);
    return box;
  }

  // لوگۆ + ناڤ بۆ ئاگەهداری و بەنەرێ پاڵەوانی
  function teamChip(id, cls) {
    var t = (typeof TEAMS !== "undefined" && TEAMS[id]) || { name: "تیم " + id, logo: "" };
    var box = el("div", cls);
    if (t.logo) {
      var img = el("img", "chip-logo");
      img.src = t.logo; img.alt = t.name;
      img.onerror = function () { img.replaceWith(el("div", "chip-logo ph", id)); };
      box.appendChild(img);
    } else box.appendChild(el("div", "chip-logo ph", id));
    var nm = el("div", "chip-name", t.name);
    nm.dir = "auto";
    box.appendChild(nm);
    return box;
  }

  // ئاگەهداری ل سەر خشتەیێ یاریان: قوناغا ئێکێ تنێ 3 یارینە
  function roundNotice(target) {
    var box = $(target);
    if (!box) return;
    box.innerHTML = "";
    box.hidden = false;
    // ناڤ ژ تیروپشکێ دهێنە وەرگرتن (ئەگەر جهـ ڤالا بیت: «تیم n»)
    function nm(id) { return (typeof TEAMS !== "undefined" && TEAMS[id] && TEAMS[id].name) || ("تیم " + id); }
    var pairs = [], rivals = [];
    PATH.forEach(function (p, i) {
      if (ROUND_OF[i] !== 0) return;
      pairs.push("\u2068" + nm(p[0]) + "\u2069 – \u2068" + nm(p[1]) + "\u2069");
      PATH.forEach(function (q) {
        var k = q.indexOf("W" + (i + 1));
        if (k >= 0 && typeof q[1 - k] === "number") rivals.push("\u2068" + nm(q[1 - k]) + "\u2069");
      });
    });
    var last = rivals.pop();
    var n = el("div", "bye-notice small");
    n.appendChild(el("div", null, "قوناغا ئێکێ " + pairs.length + " یارینە: " + pairs.join("، ") + "."));
    n.appendChild(el("div", null, "سەرکەفتیێن وان دکەڤنە بەرامبەری " + (rivals.length ? rivals.join("، ") + " و " : "") + last + "."));
    box.appendChild(n);
  }

  // بەنەرێ پاڵەوانی: پشتی ئەنجاما فاینەلێ دیار دبیت
  function champBanner(target) {
    var box = $(target);
    if (!box) return;
    box.innerHTML = "";
    var id = window.LEAGUE_CHAMPION;
    box.hidden = !id;
    if (!id) return;
    var b = el("div", "champ-banner");
    b.appendChild(el("div", "cb-cup", "🏆"));
    b.appendChild(el("div", "cb-title", "پاڵەوانێ قارەمانیا تەپا پێ یا پەیمانگەها میتان"));
    b.appendChild(teamChip(id, "chip big"));
    b.appendChild(el("div", "cb-end", "قارەمانی ب دوماهی هات"));
    box.appendChild(b);
  }
  window.LEAGUE_UI = { champBanner: champBanner };

  // ---------- ئەنجام ژ enjam.js (RESULTS) ----------
  function latin(v) {
    return String(v == null ? "" : v)
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); });
  }

  // ناڤ بێ جوداهیا ڤالاهی، پیتێن مەزن/بچووک و ي/ی، ك/ک
  function normName(v) {
    return latin(v).replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, "")
      .replace(/\s+/g, " ").trim().toLowerCase();
  }

  // تیم ب ژمارە یان ب ناڤ → ژمارا تیمی (یان null)
  // بۆ تابا گۆلکەران: ناڤ یان ژمارا تیمێ ← ژمارا جهێ وێ (دگەل ناڤێن کەڤن)
  window.LEAGUE_TEAM_ID = function (ref) { return teamId(ref, typeof TEAMS !== "undefined" ? TEAMS : {}); };

  function teamId(ref, T) {
    if (ref == null || String(ref).trim() === "") return null;
    var s = latin(ref).trim();
    if (/^\d+$/.test(s)) return T[+s] ? +s : null;
    var n = normName(ref);
    for (var k in T) if (T[k] && normName(T[k].name) === n) return +k;
    // ناڤێ کەڤن یێ تیمەکێ (پشتی ڕاستکرنا ناڤی د ALL_TEAMS دا)
    var c = window.LEAGUE_ALIAS ? window.LEAGUE_ALIAS(n) : null;
    if (c) for (k in T) if (T[k] && normName(T[k].name) === c) return +k;
    return null;
  }

  function toNum(v) {
    var s = latin(v).trim();
    return /^\d+$/.test(s) ? +s : null;
  }

  function parsePair(v) {
    var r = /(\d+)\s*[-–:]\s*(\d+)/.exec(latin(v));
    return r ? [+r[1], +r[2]] : null;
  }

  // ---------- ڕێکا قارەمانیێ یا فەرمی (19 تیم، 18 یاری) ----------
  // ژمارێن تیمان ل سەر تیروپشکێ ژ سەری بۆ خوارێ نە: 1–9 لایێ چەپێ، 10–19 لایێ ڕاستێ.
  // ژمارا یاریێ = ڕێزا فەرمی یا مامۆستای (یاریا 1 ئێکەمین یاری یە). W1 = سەرکەفتیێ یاریا 1.
  // ژمارێن د ناڤ PATH دا جهێن تیروپشکێ نە (نە ناڤ)، ئینا ڕاستکرنا ناڤەکی د ALL_TEAMS دا کێشە نینە.
  var PATH = [
    [11, 12], [2, 3], [16, 17],               // 1–3   قوناغا ئێکێ
    [4, 5], [6, 7], [8, 9], [13, 14], [18, 19], // 4–8   قوناغا 16 تیمان
    [1, "W2"], [10, "W1"], [15, "W3"],        // 9–11  قوناغا 16 تیمان
    ["W9", "W4"], ["W5", "W6"],               // 12–13 چارەکا دوماهیێ (لایێ چەپێ)
    ["W10", "W7"], ["W11", "W8"],             // 14–15 چارەکا دوماهیێ (لایێ ڕاستێ)
    ["W12", "W13"], ["W14", "W15"],           // 16–17 نیڤ دوماهیک
    ["W16", "W17"]                            // 18    فاینەل
  ];
  var ROUNDS = ["قوناغا ئێکێ", "قوناغا 16 تیمان", "چارەکا دوماهیێ", "نیڤ دوماهیک", "فاینەل"];
  // قوناغا هەر یاریەکێ (ب ڕێزا PATH)
  var ROUND_OF = [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4];
  // پشووا هەفتیێ یا پەیمانگەهێ: ئەینی (5) و شەمبی (6). یاری تنێ ژ یەکشەمبێ هەتا پێنجشەمبێ.
  var FINAL = 18, WEEKEND = [5, 6];
  window.LEAGUE_PATH = PATH;
  window.LEAGUE_ROUNDS = ROUNDS;
  window.LEAGUE_ROUND_OF = ROUND_OF;

  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function depsOf(n) {
    return PATH[n - 1].filter(function (r) { return typeof r === "string"; }).map(function (r) { return +r.slice(1); });
  }

  // ڕێکەفت و دەمژمێرا هەر یاریەکێ: یاری ب ڕێزا ژمارێن خۆ، 2 یاری د ڕۆژێ دا.
  // یاریەک چ جاران د هەمان ڕۆژێ یان بەری یاریا تیمێن وێ ژێ دهێن نابیت. ڕۆژێن ئەینی و شەمبی (پشوو) دهێنە بازدان.
  // پاشی DATES ل data.js دەستکاریێن تە دکەت.
  function scheduleDates() {
    var S = typeof SCHEDULE !== "undefined" && SCHEDULE ? SCHEDULE : {};
    var O = typeof DATES !== "undefined" && DATES ? DATES : {};
    var times = Array.isArray(S.times) && S.times.length ? S.times : ["4:00 ئێڤاری", "5:00 ئێڤاری"];
    var dayOf = {}, slotOf = {}, d = 0, count = 0, maxDay = 0;
    for (var n = 1; n <= PATH.length; n++) {
      if (n === FINAL) continue;
      var need = 0;
      depsOf(n).forEach(function (k) { if (dayOf[k] != null) need = Math.max(need, dayOf[k] + 1); });
      if (need > d) { d = need; count = 0; }
      if (count === times.length) { d++; count = 0; }
      dayOf[n] = d;
      slotOf[n] = count++;
      maxDay = Math.max(maxDay, d);
    }
    // ڕۆژێن یاریان: ژ ڕێکەفتا دەستپێکێ، بێ ئەینی و شەمبی
    var day = /^\d{4}-\d{1,2}-\d{1,2}$/.test(latin(S.start).trim()) ? parseDate(latin(S.start).trim()) : new Date(2026, 9, 28);
    var days = [];
    while (days.length <= maxDay) {
      if (WEEKEND.indexOf(day.getDay()) < 0) days.push(dateKey(day));
      day.setDate(day.getDate() + 1);
    }
    var out = {};
    for (n = 1; n <= PATH.length; n++) {
      out[n] = n === FINAL ? { date: "", time: "" } : { date: days[dayOf[n]], time: times[slotOf[n]] };
    }
    for (var k in O) {
      var no = toNum(k), o = O[k];
      if (!no || !out[no] || !o) continue;
      var ds = latin(o.date || "").trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(ds)) {
        out[no].date = dateKey(parseDate(ds));
        var wd = parseDate(ds).getDay();
        if (WEEKEND.indexOf(wd) >= 0) window.LEAGUE_WARNINGS_EXTRA.push("یاریا " + no + " ڕۆژا پشوویێ یە (" + DAYS[wd] + "، " + ds + "). ئەگەر ب ئەنقەست بیت، کێشە نینە.");
      }
      else if (o.date) window.LEAGUE_WARNINGS_EXTRA.push("ڕێکەفتا یاریا " + no + " نە دروستە: «" + o.date + "» (نموونە: \"2026-11-10\")");
      if (o.time) out[no].time = String(o.time);
      if (o.note) out[no].note = String(o.note);
    }
    return out;
  }

  function stageOf(n) { return ROUNDS[ROUND_OF[n - 1]] || ""; }

  // ---------- TEAMS ژ تیروپشکێ (DRAW) و لیستا تیمان (ALL_TEAMS) د enjam.js دا ----------
  // جهێ n ناڤێ د DRAW[n] دا وەردگریت؛ ناڤ و لوگۆ ژ ALL_TEAMS دهێنە وەرگرتن.
  // جهێ ڤالا وەکی «تیم n» دیار دبیت. ئەنجام: window.TEAMS و window.LEAGUE_DRAW
  var POSITIONS = 19;
  function loadJSON(key, def) { try { var v = JSON.parse(localStorage.getItem(key)); return v || def; } catch (e) { return def; } }
  function saveJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }
  // وەکهەڤیا دوو ناڤان (0 هەتا 1): بۆ گرێدانا ناڤێ کەڤن ب ناڤێ ڕاستکری
  function similar(a, b) {
    function grams(x) { var g = {}; for (var i = 0; i < x.length - 1; i++) { var p = x.substr(i, 2); g[p] = (g[p] || 0) + 1; } return g; }
    var ga = grams(a), gb = grams(b), inter = 0, total = Math.max(a.length - 1, 0) + Math.max(b.length - 1, 0);
    for (var p in ga) if (gb[p]) inter += Math.min(ga[p], gb[p]);
    return total ? 2 * inter / total : (a === b ? 1 : 0);
  }

  function buildTeams() {
    var A = typeof ALL_TEAMS !== "undefined" && Array.isArray(ALL_TEAMS) ? ALL_TEAMS : null;
    var Dr = typeof DRAW !== "undefined" && DRAW ? DRAW : null;
    var info = { warn: [], placed: 0, total: POSITIONS, remaining: [], active: !!(A || Dr) };
    window.LEAGUE_DRAW = info;
    if (!info.active) return;  // شێوازێ کەڤن: TEAMS ب دەست هاتیە نڤیسین

    var byName = {}, list = [];
    (A || []).forEach(function (t) {
      if (!t || !String(t.name || "").trim()) return;
      var k = normName(t.name);
      if (!byName[k]) { byName[k] = t; list.push(t); }
    });
    // ناڤێن کەڤن (aliases) د ALL_TEAMS دا: نموونە "Peshawa" ← "Peshwa FC"
    var byAlias = {};
    list.forEach(function (t) {
      (Array.isArray(t.aliases) ? t.aliases : []).forEach(function (a) {
        var k = normName(a);
        if (k && !byName[k]) byAlias[k] = t;
      });
    });
    // ڕاستکرنا ناڤی: ئەگەر ناڤێ ڕێزەکێ د ALL_TEAMS دا هاتە گوهۆڕین، ناڤێ کەڤن (د DRAW و RESULTS دا)
    // هێشتا ب هەمان تیمێ ڤە گرێدای دمینیت. ئەڤ زانیاری د ڤی وێبگەڕی دا دهێتە پاراستن.
    var names = (A || []).map(function (t) { return t && t.name ? normName(t.name) : ""; });
    var prev = loadJSON("mitanTeamNames", null), aliases = loadJSON("mitanTeamAlias", {});
    if (Array.isArray(prev)) names.forEach(function (nm, i) { if (nm && prev[i] && prev[i] !== nm) aliases[prev[i]] = i; });
    saveJSON("mitanTeamNames", names);
    saveJSON("mitanTeamAlias", aliases);
    function lookup(k) {
      if (byName[k]) return byName[k];
      if (byAlias[k]) return byAlias[k];
      var i = aliases[k];
      return i != null && A && A[i] && A[i].name ? byName[normName(A[i].name)] || null : null;
    }
    var paired = {};  // ناڤێ کەڤن ← ناڤێ نوو (ژ جووتکرنا ل خوارێ)
    window.LEAGUE_ALIAS = function (k) {
      if (byName[k]) return null;
      if (paired[k]) return paired[k];
      var t = lookup(k);
      return t ? normName(t.name) : null;
    };
    var T = {}, used = {}, unknown = [], filled = 0;
    function warn(m) { if (info.warn.indexOf(m) < 0) info.warn.push(m); }
    for (var n = 1; n <= POSITIONS; n++) {
      var raw = Dr && Dr[n] != null ? String(Dr[n]).trim() : "";
      if (!raw) { T[n] = { name: "تیم " + n, logo: "" }; continue; }
      filled++;
      var t = lookup(normName(raw)), k = t ? normName(t.name) : "";
      if (!t) {
        unknown.push({ n: n, raw: raw });
        T[n] = { name: raw, logo: "", placed: true };
        continue;
      }
      if (used[k]) warn("ئەڤ تیمە دوو جاران هاتیە دانان: «⁨" + String(t.name).trim() + "⁩» (جهێ " + used[k] + " و " + n + ")");
      else { used[k] = n; info.placed++; }
      T[n] = { name: String(t.name).trim(), logo: t.logo || "", placed: true };
    }
    // پشتی تیروپشک تەمام بوو (هەمی 19 جه): ئەگەر ناڤێ تیمەکێ د ALL_TEAMS دا هاتبیتە ڕاستکرن،
    // ناڤێ کەڤن د DRAW دا ب تیما مایی ڤە دهێتە گرێدان (ل سەر هەر کۆمپیوتەرەکێ).
    var free = list.filter(function (t) { return !used[normName(t.name)]; });
    if (filled === POSITIONS && unknown.length && unknown.length === free.length) {
      unknown.forEach(function (u) {
        var best = 0, bi = 0;
        free.forEach(function (t, i) { var sc = similar(normName(u.raw), normName(t.name)); if (sc > best) { best = sc; bi = i; } });
        var t = free.splice(bi, 1)[0], k = normName(t.name);
        paired[normName(u.raw)] = k;
        used[k] = u.n; info.placed++;
        T[u.n] = { name: String(t.name).trim(), logo: t.logo || "", placed: true };
      });
      unknown = [];
    }
    unknown.forEach(function (u) { warn("ئەڤ ناڤە د لیستا تیمان دا نینە: «⁨" + u.raw + "⁩» (جهێ " + u.n + ")"); });
    info.remaining = list.filter(function (t) { return !used[normName(t.name)]; });
    window.TEAMS = T;
  }

  // هەمی 18 یاریان دروست دکەت: تیمێن دیار، ئەنجام ژ RESULTS، و سەرکەفتی.
  function derive() {
    buildTeams();
    var T = typeof TEAMS !== "undefined" ? TEAMS : {};
    var R = typeof RESULTS !== "undefined" && Array.isArray(RESULTS) ? RESULTS : [];
    var warn = [], seen = {};
    window.LEAGUE_WARNINGS_EXTRA = [];

    function add(msg) { if (!seen[msg]) { seen[msg] = 1; warn.push(msg); } }
    // ⁨ ... ⁩: ناڤێن ئینگلیزی د ناڤ نڤیسینا کوردی دا ڕاست دیار دبن
    function notFound(name) { add("ئەڤ ناڤە نەهاتە دیتن: «⁨" + String(name).trim() + "⁩»"); }

    // ڕێزێن RESULTS
    var rows = [];
    R.forEach(function (row, i) {
      if (!Array.isArray(row) || row.length < 4) { add("ڕێزا " + (i + 1) + " د RESULTS دا نە دروستە"); return; }
      var ta = teamId(row[0], T), tb = teamId(row[3], T);
      if (ta === null) notFound(row[0]);
      if (tb === null) notFound(row[3]);
      if (ta === null || tb === null) return;
      var ga = toNum(row[1]), gb = toNum(row[2]);
      if (ga === null || gb === null) { add("گۆل نە دروستن: ⁨" + row[0] + "⁩ - ⁨" + row[3] + "⁩"); return; }
      var p = row[4] ? parsePair(row[4]) : null;
      if (row[4] && !p) add("پێناڵتی نە دروستن: «" + row[4] + "»");
      rows.push({ ta: ta, tb: tb, ga: ga, gb: gb, p: p, raw: row, used: false });
    });

    var when = scheduleDates();
    var byNo = {};
    var list = PATH.map(function (pair, i) {
      var no = i + 1;
      var m = { no: no, round: stageOf(no), date: when[no].date, time: when[no].time, note: when[no].note || "",
                result: "", pens: "", winner: null, final: no === FINAL };
      ["home", "away"].forEach(function (side, j) {
        var ref = pair[j];
        if (typeof ref === "number") { m[side] = T[ref] ? ref : null; if (!T[ref]) m[side + "Ph"] = "تیم " + ref; }
        else {
          var from = +ref.slice(1);
          m[side] = byNo[from].winner;
          if (!m[side]) m[side + "Ph"] = "سەرکەفتیێ یاریا " + from;
        }
      });
      // ئەنجام: ڕێزا RESULTS یا هەردوو تیمێن ڤێ یاریێ تێدا (ب هەر ڕێزەکێ بیت)
      if (m.home && m.away) {
        for (var k = 0; k < rows.length; k++) {
          var r = rows[k];
          if (r.used || !((r.ta === m.home && r.tb === m.away) || (r.ta === m.away && r.tb === m.home))) continue;
          r.used = true;
          // ئەگەر تیم ب ڕێزا بەرەڤاژی هاتبنە نڤیسین، گۆل و پێناڵتی دهێنە گوهۆڕین
          var flip = r.ta !== m.home;
          var h = flip ? r.gb : r.ga, a = flip ? r.ga : r.gb;
          m.result = h + " - " + a;
          var pp = r.p ? (flip ? [r.p[1], r.p[0]] : r.p) : null;
          m.pens = pp ? pp[0] + " - " + pp[1] : "";
          if (h !== a) m.winner = h > a ? m.home : m.away;
          else if (pp && pp[0] !== pp[1]) m.winner = pp[0] > pp[1] ? m.home : m.away;
          else add("یاریا " + no + " وەکهەڤ ب دوماهی هات: پێناڵتیان ل دوماهیا ڕێزێ زێدە بکە (نموونە \"4 - 3\") دا سەرکەفتی دیار ببیت");
          break;
        }
      }
      byNo[no] = m;
      return m;
    });

    rows.forEach(function (r) {
      if (!r.used) add("ئەڤ یاریە د خشتەیێ دا نینە (یان هێشتا تیمێن وێ دیار نەبووینە): ⁨" + r.raw[0] + "⁩ - ⁨" + r.raw[3] + "⁩");
    });
    window.LEAGUE_WARNINGS_EXTRA.forEach(add);
    window.LEAGUE_DRAW.warn.forEach(add);

    // ژ 2 یاریان زێدەتر د ڕۆژەکێ دا
    var perDay = {};
    list.forEach(function (m) { if (m.date && !m.note) perDay[m.date] = (perDay[m.date] || 0) + 1; });
    Object.keys(perDay).sort().forEach(function (d) {
      if (perDay[d] > 2) { var x = parseDate(d); add("ڕۆژا " + pad(x.getDate()) + "/" + pad(x.getMonth() + 1) + "/" + x.getFullYear() + " " + perDay[d] + " یاری تێدا نە (زێدەتر ژ 2). DATES ل data.js بپشکنە."); }
    });

    window.LEAGUE_CHAMPION = byNo[FINAL].winner;
    window.LEAGUE_MATCHES = list;
    window.LEAGUE_WARNINGS = warn;
    return list;
  }

  function safe(fn) {
    if (typeof fn !== "function") return;
    try { fn(); } catch (e) { if (window.console) console.error(e); }
  }

  // دەمژمێر ← ژمارە بۆ ڕێزکرنێ د ناڤ ڕۆژێ دا ("4:00 ئێڤاری" ← 240)
  function timeKey(t) {
    var r = /(\d{1,2}):(\d{2})/.exec(latin(t));
    return r ? +r[1] * 60 + +r[2] : 9999;
  }
  window.LEAGUE_TIME_KEY = timeKey;

  function render() {
    var S = typeof SETTINGS !== "undefined" ? SETTINGS : {};
    var M = derive().slice();

    document.title = S.title || document.title;
    $("brand").textContent = S.brand || "";
    $("brandSub").textContent = S.brandSub || "";
    $("institute").textContent = S.institute || "";
    $("title").textContent = S.title || "";
    $("subtitle").textContent = S.subtitle || "";
    $("supervisorLabel").textContent = S.supervisorLabel || "";
    $("supervisor").textContent = S.supervisor || "";
    var ft = $("footer");
    ft.innerHTML = "";
    ft.appendChild(el("div", "ft-copy", S.footer || ""));
    var cr = el("div", "ft-credit");
    cr.appendChild(el("span", "cr-lbl", S.creditLabel || "بەرهەڤکرن و ئامادەکرن:"));
    var crn = el("span", "cr-name", S.creditName || "Niwar Majeed");
    crn.dir = "ltr";
    cr.appendChild(crn);
    ft.appendChild(cr);
    ["instituteLogo", "drawLogo"].forEach(function (id) {
      if (S.instituteLogo) { $(id).src = S.instituteLogo; $(id).hidden = false; }
      else $(id).hidden = true;
    });
    // هەر بەشەک ب تنێ: ئەگەر ئێک ب خەلەتی بکەڤیت، بەشێن دی (تیم، تیروپشک، خشتە) هەر دیار دبن
    safe(renderDrawHelper);
    safe(window.renderBracket);
    safe(window.renderResults);
    safe(window.renderScorers);
    safe(window.renderSheets);

    champBanner("champGames");
    roundNotice("byeGames");
    roundNotice("byeResults");

    // کۆمکرن ل دویف ڕۆژێ (یاری ب ڕێزا ژمارا خۆ). یاریێن بێ ڕێکەفت (فاینەل) ل دوماهیێ.
    M.sort(function (a, b) {
      if (!a.date !== !b.date) return a.date ? -1 : 1;
      return a.date === b.date ? (timeKey(a.time) - timeKey(b.time) || a.no - b.no) : (a.date < b.date ? -1 : 1);
    });
    var groups = [];
    M.forEach(function (m) {
      var g = groups[groups.length - 1];
      if (!g || g.date !== m.date) { g = { date: m.date, items: [] }; groups.push(g); }
      g.items.push(m);
    });

    var teamCount = typeof TEAMS !== "undefined" ? Object.keys(TEAMS).length : 0;
    $("teamCount").textContent = teamCount;
    $("matchCount").textContent = M.length;
    $("dayCount").textContent = groups.filter(function (g) { return g.date; }).length;

    var root = $("schedule");
    root.innerHTML = "";
    if (!groups.length) { root.appendChild(el("p", "empty", "هێشتا چ یاری نەهاتینە دانان.")); return; }

    var tk = todayKey(), dayNo = 0;
    groups.forEach(function (g) {
      var sec = el("section", "day");
      var head = el("div", "day-head");
      if (g.date) {
        var d = parseDate(g.date);
        head.appendChild(el("span", "day-num", "ڕۆژا " + (++dayNo)));
        head.appendChild(el("span", "day-date", pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear()));
        head.appendChild(el("span", "day-name", DAYS[d.getDay()]));
        if (g.date === tk) head.appendChild(el("span", "today-badge", "ئەڤرۆ"));
      } else {
        head.appendChild(el("span", "day-num final-num", "🏆 فاینەل"));
        head.appendChild(el("span", "day-date tba", "ڕێکەفت: دێ پاشی هێتە دیارکرن"));
      }
      if (window.MITAN_SHARE) head.appendChild(window.MITAN_SHARE.dayButton(head, sec, "roj"));
      sec.appendChild(head);
      g.items.forEach(function (m) { sec.appendChild(matchCard(m, g.date === tk)); });
      root.appendChild(sec);
    });
  }

  // کارتا یاریەکێ د خشتەیێ دا
  function matchCard(m, today) {
    var card = el("article", "match" + (today ? " today" : "") + (m.final ? " final" : ""));
    card.appendChild(el("span", "round", m.final ? "🏆 فاینەل" : m.round));
    card.appendChild(el("span", "match-no", "یاریا " + m.no));
    card.appendChild(teamBlock(m.home, m.homePh));
    var c = el("div", "center");
    var goals = parsePair(m.result);
    if (goals) {
      // گۆلێن تیمێ ئێکێ ل نک تیمێ ئێکێ (ڕاست)، یێن تیمێ دووێ ل نک تیمێ دووێ (چەپ)
      card.classList.add("done");
      var row = el("div", "vs-row");
      row.appendChild(el("span", "goal", goals[0]));
      row.appendChild(el("div", "vs", "VS"));
      row.appendChild(el("span", "goal", goals[1]));
      c.appendChild(row);
    } else {
      c.appendChild(el("div", "vs", "VS"));
    }
    // یاریا نەهاتیە کرن (خۆ ڤەکێشان): نیشان ل جهێ دەمژمێرێ
    if (m.note) c.appendChild(el("div", "time tba", m.note));
    else if (m.time) c.appendChild(el("div", "time", m.time));
    if (!m.date) c.appendChild(el("div", "time tba", "ڕێکەفت: دێ پاشی هێتە دیارکرن"));
    if (goals) {
      var pp = goals[0] === goals[1] ? parsePair(m.pens) : null;
      if (pp) {
        var pr = el("div", "res-pens");
        pr.appendChild(el("span", null, "پێناڵتی"));
        var ps = el("div", "res-pens-score");
        ps.appendChild(el("span", null, pp[0]));
        ps.appendChild(el("span", "dash", "-"));
        ps.appendChild(el("span", null, pp[1]));
        pr.appendChild(ps);
        c.appendChild(pr);
      }
      c.appendChild(el("div", "done-badge", "✓ یاری ب دوماهی هات"));
    }
    card.appendChild(c);
    card.appendChild(teamBlock(m.away, m.awayPh));
    return card;
  }

  // بەشێ تیروپشکێ: هشیاری و لیستا «تیمێن مایین» (یێن هێشتا د DRAW دا نەهاتینە دانان)
  function renderDrawHelper() {
    var info = window.LEAGUE_DRAW || {};
    var wb = $("drawWarn"), box = $("drawHelper"), full = $("dhFull");
    wb.innerHTML = "";
    wb.hidden = !(info.warn && info.warn.length);
    if (!wb.hidden) {
      wb.appendChild(el("div", "res-warn-title", "⚠ هشیاری د enjam.js دا"));
      var ul = el("ul");
      info.warn.forEach(function (w) { ul.appendChild(el("li", null, w)); });
      wb.appendChild(ul);
    }
    box.hidden = full.hidden = !info.active;
    if (!info.active) return;
    var count = info.placed + " / " + info.total + " تیم هاتنە دانان";
    $("dhCount").textContent = count;
    full.textContent = count;
    var lst = $("dhList");
    lst.innerHTML = "";
    if (!info.remaining.length) {
      lst.appendChild(el("span", "dh-done", "✓ هەمی تیم هاتنە دانان"));
    } else {
      info.remaining.forEach(function (t) {
        var c = el("span", "dh-chip", String(t.name).trim());
        c.dir = "auto";
        lst.appendChild(c);
      });
    }
    box.classList.toggle("done", !info.remaining.length);
  }

  function snapshot() {
    try {
      return JSON.stringify([
        typeof SETTINGS !== "undefined" ? SETTINGS : null,
        typeof ALL_TEAMS !== "undefined" ? ALL_TEAMS : (typeof TEAMS !== "undefined" ? TEAMS : null),
        typeof DRAW !== "undefined" ? DRAW : null,
        typeof SCHEDULE !== "undefined" ? SCHEDULE : null,
        typeof DATES !== "undefined" ? DATES : null,
        typeof RESULTS !== "undefined" ? RESULTS : null,
        typeof GOALS !== "undefined" ? GOALS : null,
        typeof PLAYERS !== "undefined" ? PLAYERS : null,
        typeof PLAYERS_LIST !== "undefined" ? PLAYERS_LIST : null
      ]);
    } catch (e) { return ""; }
  }

  // بەش: خشتەیێ یاریان، تیروپشک و ئەنجام ژێک جودانە، هەر جارەکێ ئێک دیار دبیت
  var TABS = ["games", "draw", "results", "scorers", "sheets"];

  // بەشێ ئەنجامان دوو دیتن هەنە: #results (ئەنجامێن یاریان) و #results-table (خشتەیا تیمان)
  var RES_VIEWS = { "results": "matches", "results-matches": "matches", "results-table": "table" };
  var lastTab = null;

  function showTab() {
    var h = location.hash.slice(1);
    var view = RES_VIEWS[h] || null;
    // #sheets-5 ← تابا لیستا یاریزانان، فۆڕما یاریا 5
    var tab = view ? "results" : /^sheets(-\d+)?$/.test(h) ? "sheets" : (TABS.indexOf(h) >= 0 ? h : "games");
    TABS.forEach(function (t) { $(t).hidden = t !== tab; });
    document.querySelectorAll(".tabs a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-tab") === tab);
    });
    if (tab === "results") {
      $("resMatches").hidden = view !== "matches";
      $("resTable").hidden = view !== "table";
      document.querySelectorAll(".subtabs a").forEach(function (a) {
        a.classList.toggle("active", a.getAttribute("data-view") === view);
      });
      var shown = $(view === "table" ? "resTable" : "resMatches");
      shown.classList.remove("fade-in");
      void shown.offsetWidth;
      shown.classList.add("fade-in");
    }
    if (tab === "draw" && window.renderBracket) window.renderBracket();
    // گوهۆڕینا دیتنێ د ناڤ بەشێ ئەنجامان دا: بۆ سەرێ بەشی؛ گوهۆڕینا تابێ: بۆ سەرێ لاپەڕی
    if (tab === "results" && lastTab === "results") $("results").scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollTo(0, 0);
    lastTab = tab;
  }
  window.addEventListener("hashchange", showTab);

  var last = snapshot();
  render();
  showTab();

  function reload(src, done) {
    var s = document.createElement("script");
    s.src = src + "?v=" + Date.now();
    s.onload = s.onerror = function () { s.remove(); done(); };
    document.body.appendChild(s);
  }

  // گوهۆڕینێن data.js و enjam.js ب خۆ ل ماڵپەری دیار دبن (بێ Refresh) — هەر 2 چرکەیان جارەکێ
  setInterval(function () {
    reload("data.js", function () {
      reload("enjam.js", function () {
        reload("yariyzan.js", function () {
          var now = snapshot();
          if (now !== last) { last = now; render(); }
        });
      });
    });
  }, 2000);
})();
