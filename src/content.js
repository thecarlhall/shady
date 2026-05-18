// Probe Google Calendar's DOM at runtime (selectors are localized and churn).
// Day columns are discovered via [data-datekey]; overlays are positioned by
// measured pixel geometry, then clipped to the scroll container so they
// don't bleed into the sticky header / all-day section.

if (globalThis.__shadyLoaded) {
  // Re-injected by the SPA — bail; the first instance still owns listeners.
} else {
  globalThis.__shadyLoaded = true;
  shadyMain();
}

function shadyMain() {
  const SHADY = globalThis.SHADY;
  const OVERLAY_ATTR = "data-shady-overlay";
  const OVERLAY_CLASS = "shady-overlay";
  const MIN_COL_WIDTH = 40;
  const MIN_COL_HEIGHT = 200;

  let settings = null;
  let scheduled = false;
  const overlays = [];

  SHADY.loadSettings().then((s) => {
    applySettings(s);

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      const touched = Object.keys(changes).some((k) =>
        ["color", "opacity", "days"].includes(k),
      );
      if (!touched) return;
      SHADY.loadSettings().then(applySettings);
    });

    window.addEventListener("resize", scheduleRefresh, { passive: true });
    document.addEventListener("scroll", scheduleRefresh, {
      capture: true,
      passive: true,
    });

    const observer = new MutationObserver((mutations) => {
      if (mutations.some(hasForeignChange)) scheduleRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  function applySettings(next) {
    settings = next;
    document.documentElement.style.setProperty(
      "--shady-color",
      SHADY.colorWithOpacity(settings.color, settings.opacity),
    );
    scheduleRefresh();
  }

  function hasForeignChange(m) {
    for (const node of m.addedNodes) if (isForeign(node)) return true;
    for (const node of m.removedNodes) if (isForeign(node)) return true;
    return false;
  }

  function isForeign(node) {
    return node.nodeType === 1 && !node.hasAttribute(OVERLAY_ATTR);
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try {
        refresh();
      } catch (err) {
        console.warn("[shady] refresh failed:", err);
      }
    });
  }

  function refresh() {
    clearOverlays();
    if (!settings) return;

    const columns = findDayColumns();
    if (columns.length === 0) return;

    const hourMetrics = measureHours(columns[0]);
    if (!hourMetrics) return;

    const clip = visibleClip(columns[0]);
    const frag = document.createDocumentFragment();
    for (const col of columns) {
      const dayKey = dayKeyFor(col);
      if (!dayKey) continue;
      for (const [s, e] of shadedRanges(settings.days[dayKey])) {
        const overlay = buildOverlay(col, hourMetrics, clip, s, e);
        if (overlay) frag.appendChild(overlay);
      }
    }
    document.body.appendChild(frag);
  }

  function clearOverlays() {
    for (const node of overlays) node.remove();
    overlays.length = 0;
  }

  function findDayColumns() {
    const out = [];
    for (const el of document.querySelectorAll("[data-datekey]")) {
      const r = el.getBoundingClientRect();
      if (r.width > MIN_COL_WIDTH && r.height > MIN_COL_HEIGHT) out.push(el);
    }
    return out;
  }

  function dayKeyFor(col) {
    // Empirically: data-datekey mod 7 == 0 is Friday. The +5 offset rotates
    // that to index 5 ("fri") in SHADY.DAY_KEYS (sun=0 .. sat=6).
    const key = parseInt(col.getAttribute("data-datekey"), 10);
    if (!Number.isFinite(key)) return null;
    return SHADY.DAY_KEYS[(key + 5) % 7];
  }

  function measureHours(sampleColumn) {
    const rect = sampleColumn.getBoundingClientRect();
    const fullHeight = Math.max(sampleColumn.scrollHeight, rect.height);
    if (fullHeight <= 0) return null;
    return { top: rect.top, hourHeight: fullHeight / 24 };
  }

  function shadedRanges(cfg) {
    if (!cfg.enabled) return [[0, 24]];
    const start = SHADY.timeToHours(cfg.start);
    const end = SHADY.timeToHours(cfg.end);
    if (start >= end) return [[0, 24]];
    const ranges = [];
    if (start > 0) ranges.push([0, start]);
    if (end < 24) ranges.push([end, 24]);
    return ranges;
  }

  function buildOverlay(col, hourMetrics, clip, startHour, endHour) {
    const rect = col.getBoundingClientRect();
    let top = hourMetrics.top + startHour * hourMetrics.hourHeight;
    let bottom = hourMetrics.top + endHour * hourMetrics.hourHeight;
    if (clip) {
      top = Math.max(top, clip.top);
      bottom = Math.min(bottom, clip.bottom);
    }
    const height = bottom - top;
    if (height <= 0) return null;

    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute(OVERLAY_ATTR, "");
    overlay.style.cssText =
      `position:fixed;left:${rect.left}px;width:${rect.width}px;` +
      `top:${top}px;height:${height}px`;
    overlays.push(overlay);
    return overlay;
  }

  function visibleClip(col) {
    for (let p = col.parentElement; p && p !== document.body; p = p.parentElement) {
      const ov = getComputedStyle(p).overflowY;
      if (ov === "scroll" || ov === "auto") {
        const r = p.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }
    }
    return null;
  }
}
