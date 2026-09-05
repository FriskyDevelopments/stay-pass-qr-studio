const RAILS = {
  openstay: {
    id: "openstay",
    brand: "Open Stay Pass",
    short: "Stay Pass",
    role: "Credential",
    roleEs: "Pase",
    tagline: "One credential. One continuous record.",
    property: "Any stay",
    folio: "OSP-2048",
    sample: "https://staypass.dev/pass/os-2048",
    qrFg: "#061017",
    qrBg: "#EAF5F3",
    presets: [
      { id: "day", name: "Day pass", fg: "#061017", bg: "#EAF5F3" },
      { id: "night", name: "Night pass", fg: "#EAF5F3", bg: "#061017" },
      { id: "aqua", name: "Signed", fg: "#061017", bg: "#7EEAF0" },
      { id: "mint", name: "Ready", fg: "#061017", bg: "#42E99D" },
    ],
  },
  hostcasa: {
    id: "hostcasa",
    brand: "HostCasa",
    short: "HostCasa",
    role: "Arrival",
    roleEs: "Llegada",
    tagline: "The door is always open.",
    property: "La Casa de Barra",
    folio: "HC-2048",
    sample: "https://hostcasa.app/arrive/casa-de-barra",
    qrFg: "#0B1C30",
    qrBg: "#ECE6D8",
    presets: [
      { id: "cream", name: "Cream ticket", fg: "#0B1C30", bg: "#ECE6D8" },
      { id: "navy", name: "Night pass", fg: "#ECE6D8", bg: "#0B1C30" },
      { id: "gold", name: "Horizon", fg: "#0B1C30", bg: "#C9A24B" },
      { id: "sea", name: "Sea line", fg: "#0B1C30", bg: "#6FB6E8" },
    ],
  },
  folios: {
    id: "folios",
    brand: "Folios",
    short: "Folios",
    role: "Proof",
    roleEs: "Comprobante",
    tagline: "Evidence, then decision.",
    property: "La Casa de Barra",
    folio: "OS-2048",
    sample: "https://folios.works/handoff/os-2048",
    qrFg: "#102526",
    qrBg: "#F2F0E9",
    presets: [
      { id: "paper", name: "Paper record", fg: "#102526", bg: "#F2F0E9" },
      { id: "ink", name: "Ink field", fg: "#F2F0E9", bg: "#102526" },
      { id: "proof", name: "Proof rail", fg: "#102526", bg: "#37CDE0" },
      { id: "signal", name: "Issued", fg: "#102526", bg: "#C6F43D" },
    ],
  },
};

const ERROR_LEVELS = [
  { id: "L", recovery: "7%", hint: "Clean screens" },
  { id: "M", recovery: "15%", hint: "Everyday use" },
  { id: "Q", recovery: "25%", hint: "Print & wear" },
  { id: "H", recovery: "30%", hint: "Damaged tickets" },
];

const STORAGE_KEY = "stay-pass-qr-studio-v3";
const GOLD = "#C9A24B";
const SEA = "#6FB6E8";
const INK = "#102526";
const PAPER = "#F2F0E9";
const PROOF = "#37CDE0";
const OSP_INK = "#061017";
const OSP_AQUA = "#7EEAF0";
const OSP_MIST = "#EAF5F3";

const state = {
  rail: "openstay",
  text: RAILS.openstay.sample,
  fg: RAILS.openstay.qrFg,
  bg: RAILS.openstay.qrBg,
  size: 280,
  ecl: "H",
};

const els = {
  payload: document.getElementById("payload"),
  charCount: document.getElementById("char-count"),
  formBrand: document.getElementById("form-brand"),
  formRole: document.getElementById("form-role"),
  formTagline: document.getElementById("form-tagline"),
  fg: document.getElementById("fg"),
  bg: document.getElementById("bg"),
  fgPicker: document.getElementById("fg-picker"),
  bgPicker: document.getElementById("bg-picker"),
  presets: document.getElementById("presets"),
  contrast: document.getElementById("contrast"),
  size: document.getElementById("size"),
  sizeValue: document.getElementById("size-value"),
  ecl: document.getElementById("ecl"),
  canvas: document.getElementById("qr"),
  empty: document.getElementById("empty"),
  ticketTitle: document.getElementById("ticket-title"),
  ticketChip: document.getElementById("ticket-chip"),
  ticketProperty: document.getElementById("ticket-property"),
  ticketFolio: document.getElementById("ticket-folio"),
  ticketPayload: document.getElementById("ticket-payload"),
  ticketTagline: document.getElementById("ticket-tagline"),
  ticketMeta: document.getElementById("ticket-meta"),
  ticketMark: document.getElementById("ticket-mark"),
  downloadQr: document.getElementById("download-qr"),
  downloadPass: document.getElementById("download-pass"),
};

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function luminance(hex) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 1;
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function channelToLinear(channel) {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(a, b) {
  const parse = (hex) => {
    const value = hex.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return {
      r: Number.parseInt(value.slice(0, 2), 16),
      g: Number.parseInt(value.slice(2, 4), 16),
      b: Number.parseInt(value.slice(4, 6), 16),
    };
  };
  const left = parse(a);
  const right = parse(b);
  if (!left || !right) return 1;
  const lum = (color) =>
    0.2126 * channelToLinear(color.r) +
    0.7152 * channelToLinear(color.g) +
    0.0722 * channelToLinear(color.b);
  const L1 = lum(left);
  const L2 = lum(right);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

function drawOpenStay(ctx, size, ink) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  roundRect(ctx, 22, 16, 56, 68, 10);
  ctx.stroke();
  ctx.setLineDash([4, 5]);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(22, 52);
  ctx.lineTo(78, 52);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = OSP_AQUA;
  ctx.beginPath();
  ctx.arc(50, 34, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHostCasa(ctx, size) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.translate(50, 50);
  ctx.scale(0.66, 0.66);
  ctx.translate(-60, -60);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(60, 60, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(33, 62);
  ctx.lineTo(60, 33);
  ctx.lineTo(87, 62);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(60, 49, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SEA;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(29, 76);
  ctx.quadraticCurveTo(42, 69, 55, 76);
  ctx.quadraticCurveTo(68, 83, 87, 76);
  ctx.stroke();
  ctx.restore();
}

function drawFoliosF(ctx, size, ink) {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = ink;
  roundRect(ctx, 18, 16, 14, 68, 2.5);
  ctx.fill();
  roundRect(ctx, 18, 16, 50, 14, 2.5);
  ctx.fill();
  roundRect(ctx, 18, 44, 36, 12, 2.5);
  ctx.fill();
  ctx.fillStyle = PROOF;
  ctx.beginPath();
  ctx.arc(80, 23, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCenterMark(canvas, rail, background) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width;
  const pad = size * 0.22;
  const x = (size - pad) / 2;
  const y = (size - pad) / 2;
  const radius = pad * 0.18;
  ctx.save();
  ctx.fillStyle = background;
  roundRect(ctx, x, y, pad, pad, radius);
  ctx.fill();
  const inner = pad * 0.78;
  const inset = x + (pad - inner) / 2;
  ctx.translate(inset, inset);
  if (rail === "hostcasa") drawHostCasa(ctx, inner);
  else if (rail === "folios") drawFoliosF(ctx, inner, luminance(background) > 0.45 ? INK : PAPER);
  else drawOpenStay(ctx, inner, luminance(background) > 0.45 ? OSP_INK : OSP_MIST);
  ctx.restore();
}

function markSvg(rail) {
  if (rail === "hostcasa") {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#0B1C30"/><g transform="translate(50 50) scale(.66) translate(-60 -60)" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="60" cy="60" r="52" stroke="#C9A24B" stroke-width="3.4"/><path d="M33 62 L60 33 L87 62" stroke="#C9A24B" stroke-width="4.2"/><circle cx="60" cy="49" r="3.6" fill="#C9A24B" stroke="none"/><path d="M29 76 Q42 69 55 76 T87 76" stroke="#6FB6E8" stroke-width="4"/></g></svg>`;
  }
  if (rail === "folios") {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#102526"/><rect x="22" y="20" width="12" height="60" rx="2" fill="#F2F0E9"/><rect x="22" y="20" width="42" height="12" rx="2" fill="#F2F0E9"/><rect x="22" y="44" width="30" height="10" rx="2" fill="#F2F0E9"/><circle cx="78" cy="26" r="8" fill="#37CDE0"/></svg>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="#061017"/><rect x="22" y="16" width="56" height="68" rx="10" fill="none" stroke="#7EEAF0" stroke-width="4.5"/><path d="M22 52 H78" stroke="#7EEAF0" stroke-width="2.4" stroke-dasharray="4 5"/><circle cx="50" cy="34" r="6.5" fill="#7EEAF0"/></svg>`;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || !RAILS[parsed.rail]) return;
    Object.assign(state, {
      rail: parsed.rail,
      text: typeof parsed.text === "string" ? parsed.text : RAILS[parsed.rail].sample,
      fg: typeof parsed.fg === "string" ? parsed.fg : RAILS[parsed.rail].qrFg,
      bg: typeof parsed.bg === "string" ? parsed.bg : RAILS[parsed.rail].qrBg,
      size: typeof parsed.size === "number" ? Math.min(720, Math.max(160, parsed.size)) : 280,
      ecl: ERROR_LEVELS.some((level) => level.id === parsed.ecl) ? parsed.ecl : "H",
    });
  } catch {
    /* ignore */
  }
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .replace(/https?:\/\//g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "stay-pass"
  );
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function renderQr() {
  const rail = RAILS[state.rail];
  const payload = state.text.trim();
  els.charCount.textContent = String(payload.length);
  els.downloadQr.disabled = !payload;
  els.downloadPass.disabled = !payload;
  if (!payload) {
    els.canvas.classList.add("hidden");
    els.empty.classList.remove("hidden");
    return;
  }
  els.empty.classList.add("hidden");
  els.canvas.classList.remove("hidden");
  await QRCode.toCanvas(els.canvas, payload, {
    errorCorrectionLevel: state.ecl,
    margin: 2,
    width: state.size,
    color: { dark: state.fg, light: state.bg },
  });
  drawCenterMark(els.canvas, state.rail, state.bg);
  els.canvas.setAttribute("aria-label", `QR code for ${payload}`);
  void rail;
}

function renderPassPng() {
  const rail = RAILS[state.rail];
  const payload = state.text.trim();
  const pad = 48;
  const qrSize = 440;
  const width = 640;
  const height = 860;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = rail.qrBg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = rail.qrFg;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 0, width, 8);
  ctx.globalAlpha = 1;
  ctx.font = "600 13px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText("OPEN STAY PASS", pad, 56);
  ctx.font = "italic 500 36px 'Cormorant Garamond', Georgia, serif";
  ctx.fillText(`${rail.brand} ${rail.role}`, pad, 108);
  ctx.font = "500 16px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.globalAlpha = 0.72;
  ctx.fillText(rail.property, pad, 140);
  ctx.globalAlpha = 1;
  const wellX = (width - qrSize) / 2;
  const wellY = 172;
  ctx.strokeStyle = rail.qrFg;
  ctx.globalAlpha = 0.22;
  roundRect(ctx, wellX - 16, wellY - 16, qrSize + 32, qrSize + 32, 18);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.drawImage(els.canvas, wellX, wellY, qrSize, qrSize);
  const perfY = wellY + qrSize + 48;
  ctx.setLineDash([3, 9]);
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(pad, perfY);
  ctx.lineTo(width - pad, perfY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.6;
  ctx.font = "500 12px 'Hanken Grotesk', system-ui, sans-serif";
  ctx.fillText(`${rail.roleEs} · ${rail.folio} · STUDIO`, pad, perfY + 40);
  ctx.globalAlpha = 1;
  ctx.font = "500 15px 'Hanken Grotesk', system-ui, sans-serif";
  const caption = payload.length > 54 ? `${payload.slice(0, 51)}…` : payload;
  ctx.fillText(caption, pad, perfY + 72);
  ctx.font = "italic 400 18px 'Cormorant Garamond', Georgia, serif";
  ctx.globalAlpha = 0.8;
  ctx.fillText(rail.tagline, pad, height - 48);
  return canvas.toDataURL("image/png");
}

function paintChrome() {
  const rail = RAILS[state.rail];
  document.body.dataset.rail = state.rail;
  document.querySelectorAll(".rails button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.rail === state.rail));
  });
  els.formBrand.textContent = rail.brand;
  els.formRole.textContent = rail.role.toLowerCase();
  els.formTagline.textContent = rail.tagline;
  els.payload.value = state.text;
  els.fg.value = state.fg;
  els.bg.value = state.bg;
  els.fgPicker.value = /^#[0-9a-fA-F]{6}$/.test(state.fg) ? state.fg : rail.qrFg;
  els.bgPicker.value = /^#[0-9a-fA-F]{6}$/.test(state.bg) ? state.bg : rail.qrBg;
  els.size.value = String(state.size);
  els.sizeValue.textContent = `${state.size} px`;
  els.ticketTitle.textContent = `${rail.brand} ${rail.role}`;
  els.ticketChip.textContent = rail.roleEs;
  els.ticketProperty.textContent = rail.property;
  els.ticketFolio.textContent = `${rail.folio} · ${rail.roleEs}`;
  els.ticketPayload.textContent = state.text.trim() || "—";
  els.ticketTagline.textContent = rail.tagline;
  els.ticketMeta.textContent = `${state.size}px · ${state.ecl}`;
  els.ticketMark.innerHTML = markSvg(state.rail);
  els.downloadPass.textContent = `Download ${rail.brand} pass`;
  document.getElementById("advanced-hint").textContent =
    `Optional. Guests can ignore this — the pass already uses the ${rail.brand} colors and a sturdy scan mark.`;
  els.presets.innerHTML = "";
  rail.presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.setAttribute("aria-label", `Use ${preset.name} colors`);
    button.innerHTML = `<span class="swatch" style="background:${preset.bg};box-shadow:inset 6px 0 0 ${preset.fg}"></span>${preset.name}`;
    button.addEventListener("click", () => {
      state.fg = preset.fg;
      state.bg = preset.bg;
      persist();
      paintChrome();
      renderQr();
    });
    els.presets.appendChild(button);
  });
  const swap = document.createElement("button");
  swap.type = "button";
  swap.className = "chip";
  swap.textContent = "Swap";
  swap.addEventListener("click", () => {
    const nextFg = state.bg;
    state.bg = state.fg;
    state.fg = nextFg;
    persist();
    paintChrome();
    renderQr();
  });
  els.presets.appendChild(swap);
  const ratio = contrastRatio(state.fg, state.bg);
  if (ratio < 3) {
    els.contrast.className = "status warn";
    els.contrast.textContent = `Contrast ${ratio.toFixed(1)}:1 — cameras may struggle.`;
  } else {
    els.contrast.className = "status";
    els.contrast.textContent = `Contrast ${ratio.toFixed(1)}:1 — readable for most cameras.`;
  }
  els.ecl.innerHTML = "";
  ERROR_LEVELS.forEach((level) => {
    const label = document.createElement("label");
    label.className = state.ecl === level.id ? "active" : "";
    label.innerHTML = `<input type="radio" name="ecl" value="${level.id}" ${
      state.ecl === level.id ? "checked" : ""
    } /><span>${level.id} <span style="opacity:.65">${level.recovery}</span></span><small>${level.hint}</small>`;
    label.querySelector("input").addEventListener("change", () => {
      state.ecl = level.id;
      persist();
      paintChrome();
      renderQr();
    });
    els.ecl.appendChild(label);
  });
}

function switchRail(id) {
  const rail = RAILS[id];
  state.rail = id;
  state.text = rail.sample;
  state.fg = rail.qrFg;
  state.bg = rail.qrBg;
  persist();
  paintChrome();
  renderQr();
}

function bind() {
  document.querySelectorAll(".rails button").forEach((button) => {
    button.addEventListener("click", () => switchRail(button.dataset.rail));
  });
  els.payload.addEventListener("input", () => {
    state.text = els.payload.value;
    persist();
    paintChrome();
    renderQr();
  });
  const syncColor = (key, input, picker) => {
    input.addEventListener("input", () => {
      state[key] = input.value;
      persist();
      paintChrome();
      renderQr();
    });
    picker.addEventListener("input", () => {
      state[key] = picker.value;
      persist();
      paintChrome();
      renderQr();
    });
  };
  syncColor("fg", els.fg, els.fgPicker);
  syncColor("bg", els.bg, els.bgPicker);
  els.size.addEventListener("input", () => {
    state.size = Number(els.size.value);
    persist();
    paintChrome();
    renderQr();
  });
  els.downloadQr.addEventListener("click", () => {
    downloadDataUrl(els.canvas.toDataURL("image/png"), `${slugify(state.text)}-qr.png`);
  });
  els.downloadPass.addEventListener("click", () => {
    downloadDataUrl(renderPassPng(), `${slugify(state.text)}-pass.png`);
  });
}

loadStored();
bind();
paintChrome();
renderQr();
