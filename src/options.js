const SHADY = globalThis.SHADY;

const els = {
  color: document.getElementById("color"),
  opacity: document.getElementById("opacity"),
  opacityValue: document.getElementById("opacity-value"),
  preview: document.getElementById("preview"),
  daysBody: document.querySelector("#days tbody"),
  save: document.getElementById("save"),
  toast: document.getElementById("toast"),
};

const dayInputs = {};
let toastTimer = null;

async function init() {
  const settings = await SHADY.loadSettings();
  els.color.value = settings.color;
  els.opacity.value = String(settings.opacity);
  renderDayRows(settings.days);
  updatePreview();

  els.color.addEventListener("input", updatePreview);
  els.opacity.addEventListener("input", updatePreview);
  els.save.addEventListener("click", save);
}

function renderDayRows(days) {
  els.daysBody.replaceChildren();
  for (const key of SHADY.WEEK_ORDER) {
    const cfg = days[key];
    const tr = document.createElement("tr");
    const enabled = makeInput("checkbox", { checked: cfg.enabled });
    const start = makeInput("time", { value: cfg.start });
    const end = makeInput("time", { value: cfg.end });
    dayInputs[key] = { enabled, start, end };
    tr.append(td(SHADY.DAY_LABELS[key]), td(enabled), td(start), td(end));
    els.daysBody.appendChild(tr);
  }
}

function makeInput(type, props) {
  const input = document.createElement("input");
  input.type = type;
  Object.assign(input, props);
  return input;
}

function td(content) {
  const cell = document.createElement("td");
  cell.append(content);
  return cell;
}

function updatePreview() {
  const opacity = parseFloat(els.opacity.value);
  els.opacityValue.textContent = `${Math.round(opacity * 100)}%`;
  els.preview.style.setProperty(
    "--shady-preview",
    SHADY.colorWithOpacity(els.color.value, opacity),
  );
}

async function save() {
  const days = {};
  for (const key of SHADY.WEEK_ORDER) {
    const row = dayInputs[key];
    days[key] = {
      enabled: row.enabled.checked,
      start: row.start.value,
      end: row.end.value,
    };
  }
  await SHADY.saveSettings({
    color: els.color.value,
    opacity: parseFloat(els.opacity.value),
    days,
  });
  showToast("Saved");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 1500);
}

init();
