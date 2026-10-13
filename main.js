(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Single-piece dimensions, from assets/two-step-single.svg viewBox.
  const W = 160.35;
  const H = 120.27;

  // Vertical distance from the top (rotated) piece to the bottom piece.
  // The hourglass offset matches the path's 36.15 straight segment and was
  // confirmed against assets/two-step-hourglass.png.
  const OFFSETS = { full: H, hourglass: 36.15, minimal: 0 };

  // Scrubber positions (0..1) for each stop; offsets are interpolated between them.
  const STOPS = [
    { key: "full", t: 0 },
    { key: "hourglass", t: 0.5 },
    { key: "minimal", t: 1 },
  ];

  const CAPTIONS = {
    full: "The full mark: one piece rotated 180° and stacked. A 2 in outline, an S in the negative space.",
    hourglass: "Crushed together, the steps form an hourglass: work that is timely and time-bound.",
    minimal: "Fully overlapped into a single minimal mark, for sections, avatars, and backgrounds.",
  };

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(name, attrs = {}) {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }

  // Fills an <svg> with the two pieces. Returns a setter for the offset.
  // fixedHeight: keep a constant viewBox (hero) and center the content in it.
  function buildMark(svg, { fixedHeight = false } = {}) {
    svg.replaceChildren();
    const group = el("g");
    const top = el("use", {
      href: "#ts-piece",
      class: "piece piece--top",
      transform: `rotate(180 ${W / 2} ${H / 2})`,
    });
    const bottomWrap = el("g");
    const bottom = el("use", { href: "#ts-piece", class: "piece piece--bottom" });
    bottomWrap.append(bottom);
    group.append(bottomWrap, top);
    svg.append(group);

    if (fixedHeight) svg.setAttribute("viewBox", `0 0 ${W} ${2 * H}`);

    return (d) => {
      bottomWrap.setAttribute("transform", `translate(0 ${d})`);
      if (fixedHeight) {
        group.setAttribute("transform", `translate(0 ${(H - d) / 2})`);
      } else {
        svg.setAttribute("viewBox", `0 0 ${W} ${H + d}`);
      }
    };
  }

  // Static marks throughout the page.
  document.querySelectorAll("svg.mark[data-mark]").forEach((svg) => {
    const setOffset = buildMark(svg);
    setOffset(OFFSETS[svg.dataset.mark]);
    if (!svg.hasAttribute("role")) svg.setAttribute("aria-hidden", "true");
  });

  // ---------- Hero morph ----------
  const heroMark = document.getElementById("hero-mark");
  const setHero = buildMark(heroMark, { fixedHeight: true });
  const scrub = document.getElementById("scrub");
  const caption = document.getElementById("hero-caption");
  const readout = document.getElementById("readout");
  const stopButtons = document.querySelectorAll("[data-stop]");
  const playBtn = document.getElementById("play");

  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  function offsetAt(t) {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const a = STOPS[i];
      const b = STOPS[i + 1];
      if (t <= b.t) return lerp(OFFSETS[a.key], OFFSETS[b.key], (t - a.t) / (b.t - a.t));
    }
    return OFFSETS[STOPS[STOPS.length - 1].key];
  }

  function nearestStop(t) {
    return STOPS.reduce((best, s) => (Math.abs(s.t - t) < Math.abs(best.t - t) ? s : best));
  }

  function render(t) {
    const d = offsetAt(t);
    setHero(d);
    scrub.value = Math.round(t * 1000);
    const stop = nearestStop(t);
    const exact = Math.abs(stop.t - t) < 0.001;
    caption.textContent = CAPTIONS[stop.key];
    stopButtons.forEach((b) => b.classList.toggle("is-active", exact && b.dataset.stop === stop.key));
    readout.textContent = `offset ${d.toFixed(2)} / ${H}`;
  }

  let anim = null;

  function cancelAnim() {
    if (anim) cancelAnimationFrame(anim.raf);
    anim = null;
    playBtn.textContent = "Play";
  }

  // Runs a list of segments: { to, duration } tweens and { pause } holds.
  function runSequence(segments, onDone) {
    cancelAnim();
    if (reduceMotion) {
      const last = [...segments].reverse().find((s) => "to" in s);
      if (last) render(last.to);
      onDone && onDone();
      return;
    }
    let i = 0;
    let from = scrub.value / 1000;
    let start = null;
    anim = { raf: 0 };

    const step = (now) => {
      if (!anim) return;
      const seg = segments[i];
      if (!seg) { anim = null; playBtn.textContent = "Play"; onDone && onDone(); return; }
      if (start === null) start = now;
      const dur = seg.pause ?? seg.duration;
      const k = Math.min(1, (now - start) / dur);
      if ("to" in seg) render(lerp(from, seg.to, ease(k)));
      if (k >= 1) {
        if ("to" in seg) from = seg.to;
        i++;
        start = null;
      }
      anim.raf = requestAnimationFrame(step);
    };
    anim.raf = requestAnimationFrame(step);
  }

  function goTo(t, duration = 700) {
    runSequence([{ to: t, duration }]);
  }

  scrub.addEventListener("input", () => {
    cancelAnim();
    render(scrub.value / 1000);
  });

  // Snap to a stop when released close to one.
  scrub.addEventListener("change", () => {
    const t = scrub.value / 1000;
    const stop = nearestStop(t);
    if (Math.abs(stop.t - t) < 0.06 && stop.t !== t) goTo(stop.t, 250);
  });

  stopButtons.forEach((b) =>
    b.addEventListener("click", () => {
      const stop = STOPS.find((s) => s.key === b.dataset.stop);
      goTo(stop.t);
    })
  );

  playBtn.addEventListener("click", () => {
    if (anim) { cancelAnim(); return; }
    const sequence = [
      { to: 0, duration: 500 },
      { pause: 700 },
      { to: 0.5, duration: 1200 },
      { pause: 1100 },
      { to: 1, duration: 1000 },
      { pause: 1100 },
      { to: 0, duration: 1400 },
    ];
    runSequence(sequence);
    if (anim) playBtn.textContent = "Stop";
  });

  render(0);

  // ---------- Palette & toggles ----------
  const STORAGE_KEY = "twostep-demo";
  const state = Object.assign(
    { palette: "ledger", invert: false, twotone: false },
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
  );

  function applyState() {
    root.dataset.palette = state.palette;
    root.dataset.invert = String(state.invert);
    root.dataset.twotone = String(state.twotone);
    document.querySelectorAll("[data-set-palette]").forEach((b) =>
      b.setAttribute("aria-checked", String(b.dataset.setPalette === state.palette))
    );
    document.querySelectorAll("[data-toggle]").forEach((b) =>
      b.setAttribute("aria-pressed", String(state[b.dataset.toggle]))
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateFavicon();
  }

  // Favicon follows the active palette.
  function updateFavicon() {
    const styles = getComputedStyle(root);
    const ink = styles.getPropertyValue("--ink").trim();
    const path = document.getElementById("ts-piece").getAttribute("d");
    const svg =
      `<svg xmlns="${SVG_NS}" viewBox="0 0 ${W} ${H}"><g fill="${ink}">` +
      `<path d="${path}"/><path d="${path}" transform="rotate(180 ${W / 2} ${H / 2})"/></g></svg>`;
    document.getElementById("favicon").href = "data:image/svg+xml," + encodeURIComponent(svg);
  }

  document.querySelectorAll("[data-set-palette]").forEach((b) =>
    b.addEventListener("click", () => {
      state.palette = b.dataset.setPalette;
      applyState();
    })
  );
  document.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const key = b.dataset.toggle;
      state[key] = !state[key];
      applyState();
    })
  );

  applyState();
})();
