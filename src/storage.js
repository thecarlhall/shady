// Shared by content script and options page. Loaded as a classic script,
// so it exports via globalThis.SHADY rather than ES module bindings.

const SHADY_DEFAULTS = {
  color: "#000000",
  opacity: 0.15,
  days: {
    mon: { enabled: true, start: "09:00", end: "17:00" },
    tue: { enabled: true, start: "09:00", end: "17:00" },
    wed: { enabled: true, start: "09:00", end: "17:00" },
    thu: { enabled: true, start: "09:00", end: "17:00" },
    fri: { enabled: true, start: "09:00", end: "17:00" },
    sat: { enabled: false, start: "09:00", end: "17:00" },
    sun: { enabled: false, start: "09:00", end: "17:00" },
  },
};

const SHADY_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SHADY_DAY_LABELS = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

const SHADY_WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

async function shadyLoadSettings() {
  const stored = await chrome.storage.sync.get(null);
  return shadyMergeWithDefaults(stored);
}

function shadySaveSettings(settings) {
  return chrome.storage.sync.set(settings);
}

function shadyMergeWithDefaults(stored) {
  const out = {
    color: stored.color ?? SHADY_DEFAULTS.color,
    opacity:
      typeof stored.opacity === "number" ? stored.opacity : SHADY_DEFAULTS.opacity,
    days: {},
  };
  for (const key of SHADY_DAY_KEYS) {
    const fromStore = stored.days?.[key];
    const def = SHADY_DEFAULTS.days[key];
    out.days[key] = {
      enabled: fromStore?.enabled ?? def.enabled,
      start: fromStore?.start ?? def.start,
      end: fromStore?.end ?? def.end,
    };
  }
  return out;
}

function shadyTimeToHours(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h + m / 60;
}

function shadyColorWithOpacity(hex, opacity) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${opacity})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${opacity})`;
}

globalThis.SHADY = {
  DEFAULTS: SHADY_DEFAULTS,
  DAY_KEYS: SHADY_DAY_KEYS,
  DAY_LABELS: SHADY_DAY_LABELS,
  WEEK_ORDER: SHADY_WEEK_ORDER,
  loadSettings: shadyLoadSettings,
  saveSettings: shadySaveSettings,
  timeToHours: shadyTimeToHours,
  colorWithOpacity: shadyColorWithOpacity,
};
