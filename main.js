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

  // ---------- Full mark with negative-space layers ----------
  // The piece's band is a ring centered at (80.18, 80) with radii 40 and 80; its flat
  // end (x = 80.18) sits beside the finger. The "key" is the last KEY_ANGLE degrees of
  // that ring, cut along a radius.
  const RING_CENTER = [80.18, 80];
  const KEY_ANGLE = 30;

  function keyPolygon() {
    const [cx, cy] = RING_CENTER;
    const a = (KEY_ANGLE * Math.PI) / 180;
    const r = 100;
    const ex = cx - Math.sin(a) * r;
    const ey = cy - Math.cos(a) * r;
    return `${cx},${cy} ${ex.toFixed(2)},${ey.toFixed(2)} ${cx + 1},${ey.toFixed(2)} ${cx + 1},${cy}`;
  }

  function buildReadingMark(svg) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${W} ${2 * H}`);
    const pieceD = document.getElementById("ts-piece").getAttribute("d");
    const fingerD = document.getElementById("ts-finger").getAttribute("d");

    const top = el("g", { transform: `rotate(180 ${W / 2} ${H / 2})` });
    const keyClip = el("g", { "clip-path": "url(#ts-piece-clip)" });
    keyClip.append(el("polygon", { class: "key", points: keyPolygon() }));
    top.append(
      el("path", { class: "finger finger--top", d: fingerD }),
      el("path", { class: "piece", d: pieceD }),
      keyClip
    );

    const bottom = el("g", { transform: `translate(0 ${H})` });
    bottom.append(
      el("path", { class: "finger finger--bottom", d: fingerD }),
      el("path", { class: "piece", d: pieceD })
    );

    svg.append(top, bottom);
  }

  document.querySelectorAll("svg[data-reading-mark]").forEach(buildReadingMark);

  const READINGS = {
    mark: "The full mark as drawn: one piece, rotated and stacked. Pick a reading to see what's hidden in it.",
    s: "Both openings together trace an S, for Step, running through the middle of the 2.",
    finger: "Inside the top piece, a bent finger: the knuckle at the upper left, the fingertip curling down at the upper right.",
    press: "Read the end of the band as a key, and the finger is pressing it. Two Step as the easy button for HR and finance.",
  };
  const readSection = document.getElementById("read");
  const readCaption = document.getElementById("read-caption");
  const readButtons = document.querySelectorAll("[data-reading-btn]");

  function setReading(key) {
    readSection.dataset.reading = key;
    readCaption.textContent = READINGS[key];
    readButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.readingBtn === key)));
  }
  readButtons.forEach((b) => b.addEventListener("click", () => setReading(b.dataset.readingBtn)));
  setReading("mark");

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

  // ---------- Background texture: subtle / lips ----------
  const texture = document.getElementById("texture");
  const textureButtons = document.querySelectorAll("[data-texture-btn]");

  function setTexture(key) {
    texture.dataset.texture = key;
    textureButtons.forEach((b) => b.setAttribute("aria-checked", String(b.dataset.textureBtn === key)));
  }
  textureButtons.forEach((b) => b.addEventListener("click", () => setTexture(b.dataset.textureBtn)));
  setTexture("subtle");

  // ---------- Founder monogram: single mark to CG ----------
  // C = the piece rotated 90° clockwise. G = the C flipped vertically (a mirror, not a
  // pure rotation); both were checked against the reference artwork.
  const cgMark = document.getElementById("cg-mark");
  const cgScrub = document.getElementById("cg-scrub");
  const cgCaption = document.getElementById("cg-caption");
  const cgPlay = document.getElementById("cg-play");
  const cgStops = document.querySelectorAll("[data-cg-stop]");
  const CG_W = 2 * H;
  const CG_H = W;

  cgMark.setAttribute("viewBox", `0 0 ${CG_W} ${CG_H}`);
  const cPiece = el("use", { href: "#ts-piece", class: "piece piece--bottom" });
  const gPiece = el("use", { href: "#ts-piece", class: "piece piece--top" });
  cgMark.append(cPiece, gPiece);

  const CG_CAPTIONS = {
    start: "Start from the single mark: one piece, two copies stacked exactly on top of each other.",
    end: "A quarter turn makes a C; a mirrored copy beside it makes a G. The founder's initials, drawn from the same piece.",
  };

  const phase = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));

  function placePiece(node, cx, cy, angle, flipY) {
    node.setAttribute(
      "transform",
      `translate(${cx} ${cy}) scale(1 ${flipY}) rotate(${angle}) translate(${-W / 2} ${-H / 2})`
    );
  }

  function renderCG(t) {
    const turn = phase(t, 0, 0.4);
    const split = phase(t, 0.4, 0.8);
    const flip = phase(t, 0.5, 1);
    const angle = 90 * turn;
    const cy = CG_H / 2;
    placePiece(cPiece, lerp(CG_W / 2, H / 2, split), cy, angle, 1);
    placePiece(gPiece, lerp(CG_W / 2, CG_W - H / 2, split), cy, angle, Math.cos(Math.PI * flip));
    cgScrub.value = Math.round(t * 1000);
    cgCaption.textContent = t < 0.5 ? CG_CAPTIONS.start : CG_CAPTIONS.end;
    cgStops.forEach((b) => b.classList.toggle("is-active", Math.abs(Number(b.dataset.cgStop) - t) < 0.001));
  }

  let cgAnim = null;
  function cgTo(target, duration = 2200) {
    if (cgAnim) cancelAnimationFrame(cgAnim);
    const from = cgScrub.value / 1000;
    if (reduceMotion || from === target) { renderCG(target); cgAnim = null; return; }
    const span = duration * Math.abs(target - from);
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const k = Math.min(1, (now - start) / span);
      renderCG(lerp(from, target, k));
      cgAnim = k < 1 ? requestAnimationFrame(step) : null;
    };
    cgAnim = requestAnimationFrame(step);
  }

  cgScrub.addEventListener("input", () => {
    if (cgAnim) cancelAnimationFrame(cgAnim);
    cgAnim = null;
    renderCG(cgScrub.value / 1000);
  });
  cgStops.forEach((b) => b.addEventListener("click", () => cgTo(Number(b.dataset.cgStop), 1400)));
  cgPlay.addEventListener("click", () => {
    if (cgScrub.value / 1000 > 0.5) {
      renderCG(0);
      setTimeout(() => cgTo(1), 350);
    } else {
      cgTo(1);
    }
  });

  renderCG(0);

  // Plays once the first time the section scrolls into view.
  new IntersectionObserver((entries, observer) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    setTimeout(() => cgTo(1), 400);
  }, { threshold: 0.6 }).observe(cgMark);

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
