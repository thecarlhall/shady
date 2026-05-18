# Shady

Chrome extension that tints your non-working hours in Google Calendar with a color of your choice.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick this repo's root directory.
4. Visit [calendar.google.com](https://calendar.google.com). Non-working hours should be tinted.
5. Right-click the Shady toolbar icon → **Options** to change the color, opacity, and working hours per day.

After editing source files, click the reload icon on the extension card in `chrome://extensions`, then refresh calendar.google.com.

## Settings

- **Shade color** — any hex color.
- **Opacity** — 5%–80% (default 15%).
- **Working hours per day** — each weekday has an enabled checkbox and start/end times. Unchecked days are shaded all day. Defaults: Mon–Fri 09:00–17:00 enabled, Sat/Sun disabled.

Settings sync across devices via `chrome.storage.sync` — no Google sign-in, no Calendar API.

## How it works

A content script runs on `calendar.google.com`, reads your settings, and draws positioned overlay `<div>`s on top of the time grid for the hours outside your configured window. Day columns are discovered via the long-standing `[data-datekey]` attribute on Google Calendar's grid; hour height is derived from the column's measured scrollHeight. Overlays are clipped to the timed-grid's visible scroll viewport so they don't paint over the sticky header or the all-day section.

The refresh runs on resize, scroll, and DOM mutations (route/view changes), debounced to a single `requestAnimationFrame` per frame.

## Supported views

Day, Week, and 4-day / custom-day. Month and Schedule views are out of scope.

## Project layout

```
manifest.json
src/
  storage.js     # shared defaults + chrome.storage.sync helpers
  content.js     # injects overlays on calendar.google.com
  content.css
  options.html
  options.js
  options.css
icons/
```

## Limitations

- Working hours are extension-local, not synced from Google Calendar's own working-hours setting.
- If Google changes the `[data-datekey]` attribute or how the timed grid scrolls, the runtime probe in `content.js` will need an update.
