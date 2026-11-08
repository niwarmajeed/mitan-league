/* music.js — موزیکا قارەمانیێ. ڤی فایلی دەستکاری نەکە.
   کلیکەک: دەست پێ دکەت (و بەردەوام دزڤڕیت). کلیکەکا دی: ل جهێ خۆ ڕادوەستیت.
   ڕێزبەندی: فایلێ mp3 (SETTINGS.music)، پاشی ستران ژ یوتیوبێ (SETTINGS.youtube)،
   و ئەگەر هیچ نەبیت یان یوتیوب کار نەکەت، موزیکەکا ئۆرکێسترایی یا ئامادەکری. */
(function () {
  "use strict";

  var BPM = 76, BEAT = 60 / BPM, BAR = BEAT * 4;

  // ئاکۆرد: [باس، سێ نۆتێن ژۆر] ب ژمارێن MIDI
  var CHORDS = [
    [38, 62, 66, 69], // D
    [35, 59, 62, 66], // Bm
    [31, 59, 62, 67], // G
    [33, 61, 64, 69], // A
    [38, 62, 66, 69], // D
    [31, 62, 67, 71], // G
    [28, 59, 64, 67], // Em
    [33, 61, 64, 69]  // A
  ];
  // ئاواز: [نۆت، دەستپێک ب بیتان، درێژی ب بیتان]
  var MELODY = [
    [[69, 0, 1], [74, 1, 1], [78, 2, 2]],
    [[76, 0, 1], [74, 1, 1], [71, 2, 2]],
    [[74, 0, 1], [71, 1, 1], [67, 2, 1], [71, 3, 1]],
    [[69, 0, 3], [73, 3, 1]],
    [[74, 0, 1], [78, 1, 1], [81, 2, 2]],
    [[79, 0, 1], [78, 1, 1], [74, 2, 2]],
    [[76, 0, 1.5], [74, 1.5, 0.5], [76, 2, 2]],
    [[81, 0, 2], [79, 2, 1], [76, 3, 1]]
  ];

  var ctx = null, master = null, verb = null, noiseBuf = null;
  var playing = false, timer = null, nextBarTime = 0, bar = 0;
  var audioEl = null;

  // بلندیا دەنگی (0 هەتا 1)؛ ل سەر ڤی کۆمپیوتەری دهێتە پاراستن
  var volume = 0.8, lastVolume = 0.8;
  try {
    var saved = localStorage.getItem("mitanVolume");
    if (saved !== null && !isNaN(+saved)) volume = Math.min(1, Math.max(0, +saved));
  } catch (e) {}

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    var comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp);

    // دەنگڤەدان (هۆلەکا مەزن)
    verb = ctx.createConvolver();
    var len = ctx.sampleRate * 3, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = ir.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
    verb.buffer = ir;
    var wet = ctx.createGain();
    wet.gain.value = 0.35;
    verb.connect(wet);
    wet.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var nd = noiseBuf.getChannelData(0);
    for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
  }

  function out(node, vol, dry) {
    var g = ctx.createGain();
    g.gain.value = vol;
    node.connect(g);
    if (dry !== false) g.connect(master);
    g.connect(verb);
  }

  // کەمان (strings): چەند سەوتوس یێن کێمەکێ ژێک جودا
  function strings(m, t, dur, vol) {
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 1600; f.Q.value = 0.5;
    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + 0.5);
    env.gain.setValueAtTime(vol, t + dur - 0.2);
    env.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    [-7, 0, 7].forEach(function (det) {
      var o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.7);
    });
    f.connect(env);
    out(env, 1);
  }

  // بۆڕی (brass) بۆ ئاوازێ
  function brass(m, t, dur) {
    var f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 2;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(2600, t + 0.08);
    f.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.16, t + 0.06);
    env.gain.setValueAtTime(0.13, t + dur * BEAT - 0.08);
    env.gain.linearRampToValueAtTime(0, t + dur * BEAT + 0.25);
    [["sawtooth", 0], ["square", 5], ["sawtooth", -1200]].forEach(function (s) {
      var o = ctx.createOscillator();
      o.type = s[0]; o.frequency.value = hz(m); o.detune.value = s[1];
      o.connect(f); o.start(t); o.stop(t + dur * BEAT + 0.3);
    });
    f.connect(env);
    out(env, 1);
  }

  function bass(m, t, dur) {
    var env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.3, t + 0.05);
    env.gain.exponentialRampToValueAtTime(0.12, t + dur);
    env.gain.linearRampToValueAtTime(0, t + dur + 0.2);
    var o = ctx.createOscillator();
    o.type = "triangle"; o.frequency.value = hz(m);
    o.connect(env); o.start(t); o.stop(t + dur + 0.3);
    out(env, 1, true);
  }

  // تەپڵ (timpani)
  function timpani(m, t, vol) {
    var o = ctx.createOscillator(), env = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(hz(m) * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(hz(m), t + 0.08);
    env.gain.setValueAtTime(vol, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    o.connect(env); o.start(t); o.stop(t + 1.5);
    out(env, 1);
    var n = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ne = ctx.createGain();
    n.buffer = noiseBuf; nf.type = "lowpass"; nf.frequency.value = 400;
    ne.gain.setValueAtTime(vol * 0.6, t);
    ne.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    n.connect(nf); nf.connect(ne); n.start(t); n.stop(t + 0.3);
    out(ne, 1);
  }

  // سنج (cymbal) کو هێدی هێدی بلند دبیت
  function cymbalSwell(t, dur) {
    var n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), env = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true;
    f.type = "highpass"; f.frequency.value = 6000;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.12, t + dur);
    env.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    n.connect(f); f.connect(env); n.start(t); n.stop(t + dur + 0.1);
    out(env, 1);
  }

  function scheduleBar(i, t) {
    var ch = CHORDS[i];
    bass(ch[0], t, BAR * 0.95);
    bass(ch[0] + 12, t + BEAT * 2, BEAT * 1.9);
    for (var k = 1; k < 4; k++) strings(ch[k] - 12, t, BAR, 0.035);
    MELODY[i].forEach(function (n) { brass(n[0], t + n[1] * BEAT, n[2]); });
    timpani(ch[0] + 12, t, 0.5);
    timpani(ch[0] + 12, t + BEAT * 2, 0.3);
    if (i === 3 || i === 7) {
      // ڕۆلا تەپڵێ و سنج ل دوماهیا هەر بەشەکێ
      for (var r = 0; r < 8; r++) timpani(ch[0] + 12, t + BEAT * 3 + r * BEAT / 8, 0.12 + r * 0.03);
      cymbalSwell(t + BEAT * 2, BEAT * 2);
    }
  }

  function tick() {
    while (nextBarTime < ctx.currentTime + 1.5) {
      scheduleBar(bar, nextBarTime);
      nextBarTime += BAR;
      bar = (bar + 1) % CHORDS.length;
    }
  }

  function startSynth() {
    if (!ctx) {
      setup();
      nextBarTime = ctx.currentTime + 0.1;
    }
    ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.7 * volume, ctx.currentTime + 0.4);
    tick();
    timer = setInterval(tick, 250);
  }

  function stopSynth() {
    clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
    // دەمێ ڕادوەستیت، هەمی تشت ل جهێ خۆ دمینیت (suspend)
    setTimeout(function () { if (!playing) ctx.suspend(); }, 180);
  }

  function fileSrc() {
    return typeof SETTINGS !== "undefined" && SETTINGS.music ? SETTINGS.music : "";
  }

  // ستران ژ یوتیوبێ: لینکا ڤیدیۆیێ د data.js دا (youtube)
  function ytId() {
    var u = typeof SETTINGS !== "undefined" && SETTINGS.youtube ? String(SETTINGS.youtube) : "";
    var m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(u) || /^([\w-]{11})$/.exec(u.trim());
    return m ? m[1] : "";
  }

  var active = null;           // "file" | "yt" | "synth"
  var ytPlayer = null, ytReady = false, ytVid = "", ytFailed = false, ytWaiting = [];

  function ytDone(ok) {
    var w = ytWaiting; ytWaiting = [];
    w.forEach(function (cb) { cb(ok); });
  }

  // ئەگەر یوتیوب کار نەکەت (بێ ئینتەرنێت، یان ژ فایلی ڤەکری)، موزیکا ئامادەکری لێ دکەت
  function ytFallback() {
    ytFailed = true;
    ytDone(false);
    if (playing && active === "yt") { active = "synth"; startSynth(); }
  }

  function loadYT(id, cb) {
    if (ytPlayer && ytReady) {
      if (ytVid !== id) { ytVid = id; ytPlayer.loadVideoById(id); }
      cb(true);
      return;
    }
    ytWaiting.push(cb);
    if (ytPlayer || window.onYouTubeIframeAPIReady) return;

    var holder = document.createElement("div");
    holder.id = "ytPlayer";
    holder.style.cssText = "position:fixed;left:-9999px;top:0;width:200px;height:200px;";
    document.body.appendChild(holder);

    var timeout = setTimeout(function () { if (!ytReady) ytFallback(); }, 10000);

    window.onYouTubeIframeAPIReady = function () {
      ytVid = id;
      ytPlayer = new YT.Player("ytPlayer", {
        width: 200, height: 200, videoId: id,
        playerVars: { autoplay: 0, controls: 0, loop: 1, playlist: id, playsinline: 1 },
        events: {
          onReady: function () { ytReady = true; clearTimeout(timeout); ytPlayer.setVolume(Math.round(volume * 100)); ytDone(true); },
          // دەمێ ستران ب دوماهی دهێت، ژ دەستپێکێ دزڤڕیت (بێ ڕاوەستان)
          onStateChange: function (e) {
            if (e.data === 0 && playing && active === "yt") { ytPlayer.seekTo(0); ytPlayer.playVideo(); }
          },
          onError: function () { clearTimeout(timeout); ytFallback(); }
        }
      });
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = function () { clearTimeout(timeout); ytFallback(); };
    document.head.appendChild(s);
  }

  function play() {
    var src = fileSrc();
    if (src) {
      if (!audioEl || audioEl.getAttribute("data-src") !== src) {
        if (audioEl) audioEl.pause();
        audioEl = new Audio(src);
        audioEl.loop = true;
        audioEl.volume = volume;
        audioEl.setAttribute("data-src", src);
      }
      active = "file";
      audioEl.play().catch(function () {});
      return;
    }
    var id = ytId();
    // یوتیوب ژ فایلەکێ ڤەکری (file://) کار ناکەت؛ ب start.bat ڤەکە
    if (id && !ytFailed && location.protocol !== "file:") {
      active = "yt";
      loadYT(id, function (ok) {
        if (!ok || !playing || active !== "yt") return;
        ytPlayer.playVideo();
        // ئەگەر پشتی 6 چرکەیان دەست پێ نەکر، موزیکا ئامادەکری لێ دکەت
        setTimeout(function () {
          var st = ytPlayer.getPlayerState();
          if (playing && active === "yt" && st !== 1 && st !== 3 && st !== 2) ytFallback();
        }, 6000);
      });
      return;
    }
    active = "synth";
    startSynth();
  }

  // ڕاوەستاندن ل جهێ خۆ: دەمێ دیسان لێ دکەی، ژ هەمان جهی بەردەوام دبیت
  function pause() {
    if (active === "file" && audioEl) audioEl.pause();
    else if (active === "yt" && ytPlayer && ytReady) ytPlayer.pauseVideo();
    else if (active === "synth" && ctx) stopSynth();
  }

  function toggle() {
    var btn = document.getElementById("musicBtn");
    playing = !playing;
    btn.classList.toggle("playing", playing);
    document.getElementById("musicLabel").textContent = playing ? "ڕاوەستاندن" : "موزیک";
    if (playing) play();
    else pause();
  }

  document.getElementById("musicBtn").addEventListener("click", toggle);

  // کۆنترۆلا دەنگی: هێلا (slider) بۆ کێم و زێدەکرنێ، ئایکۆن بۆ بێدەنگکرنێ
  var range = document.getElementById("volRange");
  var volBtn = document.getElementById("volBtn");

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    if (volume > 0) lastVolume = volume;
    try { localStorage.setItem("mitanVolume", String(volume)); } catch (e) {}
    if (audioEl) audioEl.volume = volume;
    if (ytPlayer && ytReady) ytPlayer.setVolume(Math.round(volume * 100));
    if (ctx && master && playing && active === "synth") {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.7 * volume, ctx.currentTime + 0.1);
    }
    var pct = Math.round(volume * 100);
    range.value = pct;
    range.style.setProperty("--fill", pct + "%");
    document.getElementById("volVal").textContent = pct;
    var ctl = document.getElementById("volCtl");
    ctl.classList.toggle("muted", pct === 0);
    ctl.classList.toggle("low", pct > 0 && pct < 50);
    volBtn.title = pct === 0 ? "دەنگ ڤەکە" : "بێدەنگ بکە";
  }

  range.addEventListener("input", function () { setVolume(range.value / 100); });
  volBtn.addEventListener("click", function () { setVolume(volume > 0 ? 0 : lastVolume || 0.8); });
  setVolume(volume);
})();
