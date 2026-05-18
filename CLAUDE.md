# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

Shady is a Chrome MV3 extension that tints the user's non-working hours in Google Calendar with a user-selectable color and opacity. Working hours are configured per weekday in the extension's options page (not via the Google Calendar API). Reference (paid) extension: [Shade Calendar](https://shadecalendar.com/posts/how-to-grey-out-non-working-hours-in-google-calendar/).

## Architecture

Three scripts, no build system, no framework, vanilla JS:

- `src/storage.js` — shared by the content script and the options page. Exports defaults, day-key/label/order constants, `loadSettings()`, `saveSettings()`, and small utilities (`timeToHours`, `colorWithOpacity`) on `globalThis.SHADY`. Loaded as a classic script in both contexts; symbols hang off `globalThis` rather than ES module bindings.
- `src/content.js` — runs on `https://calendar.google.com/*`. Probes the DOM at runtime (selectors are localized and churn), finds day columns by the stable `[data-datekey]` attribute, measures hour geometry from the column's scrollHeight, and injects `position: fixed` overlay `<div>`s for the non-working ranges. Overlays are clipped to the scroll container's visible viewport so they don't bleed into the sticky header / all-day section.
- `src/options.html` / `options.js` / `options.css` — settings UI: color picker, opacity slider, per-day enabled/start/end inputs. Writes to `chrome.storage.sync`; the content script picks up changes live via `chrome.storage.onChanged`.

### Day-key conventions

`SHADY.DAY_KEYS = ["sun", "mon", ..., "sat"]` is the canonical 0-indexed-from-Sunday order. `SHADY.WEEK_ORDER` is the same set in Monday-first display order. Google Calendar's `data-datekey` is days since 1899-12-30 (a Saturday); `dayKeyFor()` reduces it via `(key + 6) % 7` to index into `DAY_KEYS`.

### Refresh loop

`content.js` runs in a single `shadyMain()` closure guarded by a `globalThis.__shadyLoaded` sentinel (prevents duplicate listeners when GCal re-injects on SPA navigation). A broad `MutationObserver` on `document.body` filters out our own overlays (via the `data-shady-overlay` attribute) to break the feedback loop, then schedules a `requestAnimationFrame`-debounced `refresh()`. Refresh also runs on `resize` and capturing `scroll`. Overlays are batched into a `DocumentFragment` and tracked in a JS array (no `querySelector` scan on clear).

## Common commands

```bash
# Validate manifest + parse all scripts
python3 -c "import json; json.load(open('manifest.json'))"
for f in src/*.js; do node --check "$f"; done
```

There are no automated tests. End-to-end check is manual: `chrome://extensions` → Developer mode → **Load unpacked** → select repo root → open calendar.google.com.

## Gotchas

- **Overlays bleeding above the timed grid**: solved by clipping to the scroll container's `getBoundingClientRect()` in `visibleClip()`. If a future GCal layout puts the all-day section inside the scroll container as a sticky child, the clip will need to anchor to the hour-ruler's top instead.
- **MutationObserver feedback loop**: every overlay we inject is a DOM mutation. The observer filters added/removed nodes that carry `data-shady-overlay`; do not remove that attribute.
- **No DOM-inspection during initial development**: Google Calendar requires a sign-in we can't drive from MCP headless Chrome, and the user's Chrome lacks remote debugging. Selectors must be inferred from known stable hooks (`[data-datekey]`) and validated by manual reload after edits.
