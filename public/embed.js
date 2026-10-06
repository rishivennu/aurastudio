/*! aura.studio embed v1 | one-line animated gradient background | no dependencies
   <script src="https://YOUR-SITE/embed.js" data-colors="#ff5d8f,#7b6cff,#19d3ff,#0a0a0b" data-style="blobs" data-speed="1" defer></script>
   data-colors  2 to 6 hex colours; the darkest becomes the base
   data-style   blobs | mesh | aurora
   data-speed   0 to 3 (0 = still)
   data-grain   1 to add film grain
   data-target  CSS selector to paint behind (default: the whole page)
   data-opacity 0 to 1 */
(function () {
  var s = document.currentScript; if (!s || window.auraEmbed) return;
  window.auraEmbed = { pause: function () {}, play: function () {} };
  var d = s.dataset || {};
  var cols = String(d.colors || "#ff5d8f,#7b6cff,#19d3ff,#0a0a0b").split(",").map(function (c) { return c.trim(); })
    .filter(function (c) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c); }).slice(0, 6);
  if (cols.length < 2) cols = ["#ff5d8f", "#7b6cff", "#19d3ff", "#0a0a0b"];
  var style = /^(blobs|mesh|aurora)$/.test(d.style || "") ? d.style : "blobs";
  var speed = Math.max(0, Math.min(3, parseFloat(d.speed || "1"))); if (isNaN(speed)) speed = 1;
  var opacity = Math.max(0, Math.min(1, parseFloat(d.opacity || "1"))); if (isNaN(opacity)) opacity = 1;
  var mq = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduce = !!(mq && mq.matches);

  function rgb(h) { h = h.slice(1); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function lum(h) { var c = rgb(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  var sorted = cols.slice().sort(function (a, b) { return lum(a) - lum(b); });
  var base = sorted[0], glow = sorted.slice(1);

  function start() {
    var host = null;
    try { host = d.target ? document.querySelector(d.target) : null; } catch (e) { host = null; }
    var full = !host;
    if (full) host = document.body;
    if (!host) return;
    // colour first, so the page is never blank while the script runs or if canvas is unavailable
    if (full) { document.documentElement.style.backgroundColor = base; host.style.background = "transparent"; }
    else host.style.backgroundColor = base;
    if (!full) { if (getComputedStyle(host).position === "static") host.style.position = "relative"; host.style.isolation = "isolate"; }
    var c = document.createElement("canvas");
    c.setAttribute("aria-hidden", "true");
    c.className = "aura-embed-bg";
    c.style.cssText = (full ? "position:fixed;" : "position:absolute;") + "inset:0;width:100%;height:100%;pointer-events:none;opacity:" + opacity + ";filter:blur(" + (style === "aurora" ? 18 : 28) + "px) saturate(1.15);transform:scale(1.08)";
    var clip = document.createElement("div");
    clip.style.cssText = (full ? "position:fixed;" : "position:absolute;") + "inset:0;overflow:hidden;pointer-events:none;z-index:-1";
    clip.appendChild(c);
    if (d.grain === "1") {
      var g = document.createElement("div");
      g.style.cssText = "position:absolute;inset:0;opacity:.14;mix-blend-mode:overlay;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
      clip.appendChild(g);
    }
    host.insertBefore(clip, host.firstChild);
    var ctx = c.getContext("2d"); if (!ctx) return;

    var W = 0, H = 0;
    function size() {
      var r = full ? { width: innerWidth, height: innerHeight } : host.getBoundingClientRect();
      // a quarter-resolution canvas, blurred by CSS, looks identical and costs almost nothing
      var sc = Math.min(0.25, 420 / Math.max(1, r.width));
      W = c.width = Math.max(32, Math.round(r.width * sc)); H = c.height = Math.max(32, Math.round(r.height * sc));
    }
    size();
    var seed = 0; for (var i = 0; i < cols.join("").length; i++) seed = (seed * 31 + cols.join("").charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed + 0x6d2b79f5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    var n = style === "mesh" ? Math.max(4, glow.length) : glow.length * 2;
    var blobs = [];
    for (var b = 0; b < n; b++) blobs.push({ c: rgb(glow[b % glow.length]), x: rnd(), y: rnd(), r: style === "mesh" ? 0.55 + rnd() * 0.3 : 0.3 + rnd() * 0.3, fx: 0.6 + rnd(), fy: 0.6 + rnd(), p: rnd() * 6.28, a: 0.12 + rnd() * 0.12 });

    function frame(t) {
      var T = t * 0.00012 * speed;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = style === "mesh" ? "source-over" : "lighter";
      var m = Math.max(W, H);
      if (style === "aurora") {
        for (var j = 0; j < glow.length; j++) {
          var cc = rgb(glow[j]);
          for (var x = 0; x <= W; x += 4) {
            var u = x / W, hgt = H * (0.45 + 0.25 * Math.sin(u * 5 + T * 6 + j * 1.7) * Math.sin(u * 2.3 - T * 3 + j));
            var y0 = H * (0.15 + j * 0.12) + 20 * Math.sin(u * 3 + T * 4);
            var gr = ctx.createLinearGradient(0, y0, 0, y0 + hgt);
            gr.addColorStop(0, "rgba(" + cc + ",0)"); gr.addColorStop(0.5, "rgba(" + cc + ",.5)"); gr.addColorStop(1, "rgba(" + cc + ",0)");
            ctx.fillStyle = gr; ctx.fillRect(x, y0, 4.2, hgt);
          }
        }
        return;
      }
      for (var q = 0; q < blobs.length; q++) {
        var o = blobs[q];
        var px = (o.x + 0.22 * Math.sin(T * 7 * o.fx + o.p)) * W, py = (o.y + 0.22 * Math.cos(T * 6 * o.fy + o.p * 1.3)) * H, rr = o.r * m;
        var rg = ctx.createRadialGradient(px, py, 0, px, py, rr);
        var al = style === "mesh" ? 0.9 : 0.55 + o.a;
        rg.addColorStop(0, "rgba(" + o.c + "," + al + ")"); rg.addColorStop(1, "rgba(" + o.c + ",0)");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      }
    }

    var raf = 0, on = true, seen = true, last = 0, t0 = performance.now() - 40000;
    function loop(now) {
      raf = 0;
      if (!on || !seen) return;
      // ~30fps is plenty for slow colour drift and halves battery use
      if (now - last > 33) { frame(now - t0); last = now; }
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && on && seen && !reduce && speed > 0) raf = requestAnimationFrame(loop); }
    frame(40000);
    kick();
    document.addEventListener("visibilitychange", function () { on = !document.hidden; kick(); });
    if (!full && "IntersectionObserver" in window) new IntersectionObserver(function (e) { seen = e[0].isIntersecting; kick(); }).observe(host);
    var rt; function onResize() { clearTimeout(rt); rt = setTimeout(function () { size(); frame(performance.now() - t0); }, 120); }
    if (full) addEventListener("resize", onResize); else if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(host);
    if (mq && mq.addEventListener) mq.addEventListener("change", function (e) { reduce = e.matches; if (reduce) { cancelAnimationFrame(raf); raf = 0; } kick(); });
    window.auraEmbed = { pause: function () { on = false; }, play: function () { on = true; kick(); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
