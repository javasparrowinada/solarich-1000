"use strict";

/* =========================================================
   シート領域 = 抜き型データ（assets/cutpass.svg）そのもの
   ---------------------------------------------------------
   MASK  … cutpass.svg の viewBox 全体を、ベース画像に対する比率で
           どこに置けば実機と一致するか。
           ベース画像の穴（ディスプレイ・USB-A×2・USB-C×2）の中心と
           抜き型の穴の中心を最小二乗で合わせて算出（残差 0.8px 以下）
   SHEET … そのときのシート外形の範囲（模様の配置基準に使う）
   ========================================================= */
const MASK  = { x: 0.057772, y: 0.198222, w: 0.893396, h: 0.631685 };
const SHEET = { x: 0.175178, y: 0.326046, w: 0.658941, h: 0.376503 };

/* カード／プレビューで表示する範囲（余白を落とすためのトリミング） */
const VIEW = { x0: 0.045, y0: 0.175, x1: 0.955, y1: 0.800 };

/* =========================================================
   state（保存はしません。リロードで消えます）
   ========================================================= */
const S = {
  base: null,
  mask: null,  // cutpass.svg
  items: {},   // id -> item
  current: null
};

for (const cat of CATALOG) {
  for (const it of cat.items) {
    S.items[it.id] = {
      id: it.id, catId: cat.id, catName: cat.name, no: it.no,
      name: it.name || "",
      mode: "color",
      hex: "#EE7A20",
      pattern: null, patternName: "", prompt: "",
      fit: "cover", scale: 100, offX: 0, offY: 0, rot: 0,
      applied: false,
      room: null
    };
  }
}

const $ = id => document.getElementById(id);

/* =========================================================
   描画
   ========================================================= */
/* 正規化座標 → キャンバス座標 の変換器 */
function mapper(cw, ch) {
  const sx = VIEW.x1 - VIEW.x0, sy = VIEW.y1 - VIEW.y0;
  return {
    x: n => (n - VIEW.x0) / sx * cw,
    y: n => (n - VIEW.y0) / sy * ch,
    w: n => n / sx * cw,
    h: n => n / sy * ch
  };
}

/* 色／模様を抜き型で切り抜いた1枚を作る（使い回しの裏キャンバス） */
const _layer = document.createElement("canvas");
function makeLayer(cw, ch, item) {
  if (!S.mask) return null;
  _layer.width = cw; _layer.height = ch;
  const g = _layer.getContext("2d");
  g.clearRect(0, 0, cw, ch);

  const m = mapper(cw, ch);
  const px = m.x(SHEET.x), py = m.y(SHEET.y), pw = m.w(SHEET.w), ph = m.h(SHEET.h);

  if (item.mode === "pattern" && item.pattern) {
    drawPattern(g, item, px, py, pw, ph);
  } else {
    g.fillStyle = item.hex;
    g.fillRect(px, py, pw, ph);
  }

  /* 抜き型で切り抜く */
  g.globalCompositeOperation = "destination-in";
  g.drawImage(S.mask, m.x(MASK.x), m.y(MASK.y), m.w(MASK.w), m.h(MASK.h));
  g.globalCompositeOperation = "source-over";
  return _layer;
}

/* キャンバス1枚を描く。item.applied が false ならベース画像のまま */
function paint(canvas, item, showOutline) {
  const g = canvas.getContext("2d");
  const cw = canvas.width, ch = canvas.height;
  g.clearRect(0, 0, cw, ch);
  if (!S.base) return;

  const BW = S.base.naturalWidth, BH = S.base.naturalHeight;
  g.drawImage(S.base,
    VIEW.x0 * BW, VIEW.y0 * BH, (VIEW.x1 - VIEW.x0) * BW, (VIEW.y1 - VIEW.y0) * BH,
    0, 0, cw, ch);

  if (item && item.applied) {
    const layer = makeLayer(cw, ch, item);
    if (layer) g.drawImage(layer, 0, 0);
  }

  if (showOutline) {
    const layer = makeLayer(cw, ch, { mode: "color", hex: "#FF2D2D" });
    if (layer) { g.save(); g.globalAlpha = 0.45; g.drawImage(layer, 0, 0); g.restore(); }
  }
}

function drawPattern(g, item, px, py, pw, ph) {
  const img = item.pattern;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const sc = item.scale / 100;
  const ox = (item.offX / 100) * pw * 0.5;
  const oy = (item.offY / 100) * ph * 0.5;

  g.save();
  g.translate(px + pw / 2 + ox, py + ph / 2 + oy);
  g.rotate(item.rot * Math.PI / 180);
  if (item.fit === "repeat") {
    const pat = g.createPattern(img, "repeat");
    const unit = Math.max(pw, ph) / 2 * sc;
    const k = unit / Math.max(iw, ih);
    if (pat.setTransform) pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
    g.fillStyle = pat;
    const big = Math.hypot(pw, ph) * 1.6;
    g.fillRect(-big / 2, -big / 2, big, big);
  } else {
    const cover = Math.max(pw / iw, ph / ih) * sc;
    const dw = iw * cover, dh = ih * cover;
    g.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  }
  g.restore();
}

/* =========================================================
   画像の読み込み
   ========================================================= */
function loadFile(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}
function pickFile(cb) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => { if (inp.files[0]) cb(inp.files[0]); };
  inp.click();
}
function wireDrop(el, onFile) {
  ["dragenter", "dragover"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => el.addEventListener(ev, e => { e.preventDefault(); el.classList.remove("over"); }));
  el.addEventListener("drop", e => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onFile(f);
  });
}

/* =========================================================
   一覧
   ========================================================= */
const CARD_W = 480;
const CARD_H = Math.round(CARD_W * (VIEW.y1 - VIEW.y0) / (VIEW.x1 - VIEW.x0));
const cardCanvas = {};   // id -> canvas
const cardEl = {};       // id -> element

function buildCatalog() {
  const root = $("catalogRoot");
  const nav = $("catnav");
  root.innerHTML = ""; nav.innerHTML = "";

  for (const cat of CATALOG) {
    const a = document.createElement("a");
    a.href = "#" + cat.id; a.textContent = cat.name;
    nav.appendChild(a);

    const sec = document.createElement("section");
    sec.className = "cat"; sec.id = cat.id;
    sec.innerHTML = `<div class="cat-head"><span class="cat-num">${cat.id.replace("c", "")}</span>
        <h2>${cat.name}</h2><span class="cat-count">${cat.items.length}枠</span></div>`;
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const it of cat.items) grid.appendChild(buildCard(S.items[it.id]));
    sec.appendChild(grid);
    root.appendChild(sec);
  }
  $("statCat").textContent = CATALOG.length;
  $("statItem").textContent = Object.keys(S.items).length;
  updateFilled();
}

function buildCard(item) {
  const el = document.createElement("button");
  el.className = "card";
  el.innerHTML = `
    <div class="card-visual">
      <div class="card-pane"><span class="pane-tag">本体</span><canvas width="${CARD_W}" height="${CARD_H}"></canvas></div>
      <div class="card-pane room"><span class="pane-tag">イメージ</span>
        <div class="room-empty"><span class="plus">＋</span>イメージ画像</div>
      </div>
    </div>
    <div class="card-meta">
      <span class="card-chip"></span>
      <span class="card-name"></span>
      <span class="card-no">${String(item.no).padStart(2, "0")}</span>
    </div>`;
  cardCanvas[item.id] = el.querySelector("canvas");
  cardEl[item.id] = el;
  el.addEventListener("click", () => openDetail(item.id));
  refreshCard(item.id);
  return el;
}

function refreshCard(id) {
  const item = S.items[id], el = cardEl[id];
  if (!el) return;
  paint(cardCanvas[id], item, false);

  const chip = el.querySelector(".card-chip");
  const name = el.querySelector(".card-name");
  if (item.applied) {
    if (item.mode === "pattern" && item.pattern) {
      chip.style.background = `url(${item.pattern.src}) center/cover`;
    } else {
      chip.style.background = item.hex;
    }
    chip.style.display = "";
    name.textContent = item.name || (item.mode === "pattern" ? "（模様・名称未設定）" : item.hex);
    name.classList.remove("empty");
  } else {
    chip.style.display = "none";
    name.textContent = "未設定";
    name.classList.add("empty");
  }

  const roomPane = el.querySelector(".card-pane.room");
  roomPane.querySelectorAll("img").forEach(n => n.remove());
  const empty = roomPane.querySelector(".room-empty");
  if (item.room) {
    empty.style.display = "none";
    const img = document.createElement("img");
    img.src = item.room.src;
    roomPane.appendChild(img);
  } else {
    empty.style.display = "";
  }
  updateFilled();
}

function updateFilled() {
  const n = Object.values(S.items).filter(i => i.applied).length;
  $("statFilled").textContent = n;
}

/* =========================================================
   詳細
   ========================================================= */
function openDetail(id) {
  S.current = id;
  const it = S.items[id];

  $("dCat").textContent = it.catName;
  $("dNo").textContent = "No." + String(it.no).padStart(2, "0");
  $("dName").value = it.name;

  setSeg("dMode", "mode", it.mode);
  $("dColorArea").style.display = it.mode === "color" ? "" : "none";
  $("dPatArea").style.display = it.mode === "pattern" ? "" : "none";

  $("dPicker").value = it.hex;
  $("dHex").value = it.hex.toUpperCase();
  syncRGBFromHex();

  setSeg("dFit", "fit", it.fit);
  $("dScale").value = it.scale; $("vScale").textContent = it.scale + "%";
  $("dOffX").value = it.offX;   $("vOffX").textContent = it.offX;
  $("dOffY").value = it.offY;   $("vOffY").textContent = it.offY;
  $("dRot").value = it.rot;     $("vRot").textContent = it.rot + "°";

  $("genPrompt").value = it.prompt || "";
  genStatus("");

  refreshPatInfo();
  refreshRoom();
  refreshApplyBtn();
  repaintDetail();

  $("overlay").classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  $("overlay").classList.remove("show");
  document.body.style.overflow = "";
  S.current = null;
}

function cur() { return S.items[S.current]; }

function repaintDetail() {
  paint($("dCanvas"), cur(), $("dOutline").checked);
}

function refreshApplyBtn() {
  const it = cur();
  $("btnApply").textContent = it.applied ? "反映を解除" : "反映する";
  $("btnApply").classList.toggle("btn-primary", !it.applied);
  $("applyState").textContent = it.applied ? "反映中" : "反映前（ベースのまま）";
  $("applyState").classList.toggle("on", it.applied);
}

function setSeg(segId, key, value) {
  document.querySelectorAll(`#${segId} button`).forEach(b => {
    b.classList.toggle("active", b.dataset[key] === value);
  });
}

function syncRGBFromHex() {
  const h = $("dHex").value.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return;
  $("dR").value = $("dRr").value = parseInt(h.slice(0, 2), 16);
  $("dG").value = $("dGr").value = parseInt(h.slice(2, 4), 16);
  $("dB").value = $("dBr").value = parseInt(h.slice(4, 6), 16);
}
function hexFromRGB() {
  const v = k => Math.max(0, Math.min(255, parseInt($(k).value || 0, 10)));
  return "#" + [v("dR"), v("dG"), v("dB")].map(n => n.toString(16).padStart(2, "0")).join("").toUpperCase();
}
function setColor(hex) {
  const it = cur(); if (!it) return;
  it.hex = hex;
  $("dPicker").value = hex; $("dHex").value = hex.toUpperCase();
  syncRGBFromHex();
  repaintDetail();
}

function refreshPatInfo() {
  const it = cur();
  const box = $("dPatInfo");
  if (it.pattern) {
    box.classList.add("show");
    $("dPatThumb").src = it.pattern.src;
    $("dPatMeta").textContent = `${it.patternName}（${it.pattern.naturalWidth}×${it.pattern.naturalHeight}px）`;
  } else {
    box.classList.remove("show");
  }
}

function refreshRoom() {
  const it = cur();
  const wrap = $("dRoomWrap");
  wrap.innerHTML = "";
  if (it.room) {
    const img = document.createElement("img");
    img.src = it.room.src;
    wrap.className = "room-box";
    wrap.appendChild(img);
  } else {
    wrap.className = "";
    const d = document.createElement("div");
    d.className = "room-drop";
    d.innerHTML = "<strong>イメージ画像をドロップ / クリックして選択</strong><span>部屋の写真など、設置シーンの画像</span>";
    d.addEventListener("click", () => pickFile(setRoom));
    wireDrop(d, setRoom);
    wrap.appendChild(d);
  }
}

async function setRoom(file) {
  const it = cur(); if (!it) return;
  it.room = await loadFile(file);
  refreshRoom();
  refreshCard(it.id);
}

/* =========================================================
   イベント
   ========================================================= */
$("dClose").addEventListener("click", closeDetail);
$("overlay").addEventListener("click", e => { if (e.target === $("overlay")) closeDetail(); });
document.addEventListener("keydown", e => {
  if (!S.current) return;
  if (e.key === "Escape") closeDetail();
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});

function step(d) {
  const ids = Object.keys(S.items);
  const i = ids.indexOf(S.current);
  const next = ids[(i + d + ids.length) % ids.length];
  openDetail(next);
}
$("dPrev").addEventListener("click", () => step(-1));
$("dNext").addEventListener("click", () => step(1));

$("btnApply").addEventListener("click", () => {
  const it = cur();
  it.applied = !it.applied;
  refreshApplyBtn();
  repaintDetail();
  refreshCard(it.id);
});

$("dName").addEventListener("input", e => {
  cur().name = e.target.value;
  refreshCard(cur().id);
});

document.querySelectorAll("#dMode button").forEach(b => {
  b.addEventListener("click", () => {
    const it = cur();
    it.mode = b.dataset.mode;
    setSeg("dMode", "mode", it.mode);
    $("dColorArea").style.display = it.mode === "color" ? "" : "none";
    $("dPatArea").style.display = it.mode === "pattern" ? "" : "none";
    repaintDetail(); refreshCard(it.id);
  });
});

$("dPicker").addEventListener("input", e => setColor(e.target.value.toUpperCase()));
$("dHex").addEventListener("input", e => {
  const h = e.target.value.trim().replace(/^#?/, "#");
  if (/^#[0-9a-fA-F]{6}$/.test(h)) { cur().hex = h.toUpperCase(); $("dPicker").value = h; syncRGBFromHex(); repaintDetail(); }
});
["dR", "dG", "dB"].forEach(k => $(k).addEventListener("input", () => setColor(hexFromRGB())));
["dRr", "dGr", "dBr"].forEach((k, i) => $(k).addEventListener("input", e => {
  $(["dR", "dG", "dB"][i]).value = e.target.value;
  setColor(hexFromRGB());
}));

/* ---------------------------------------------------------
   プロンプトから柄を生成（Gemini API をブラウザから直接呼ぶ）
   APIキーはこのページのメモリ上だけに置く。保存はしない。
   --------------------------------------------------------- */
S.apiKey = "";

/* 生成させたいのは「シートに貼る平らな柄」なので、その条件を付け足す */
function wrapPrompt(p) {
  return `${p}

上記のイメージで、製品に貼るシート用のテクスチャ画像を作ってください。
条件:
- 真上から見た平らな柄。立体的な影・光沢・反射・パースを付けない
- 全面が柄で埋まっていること。余白・枠・背景の抜けを作らない
- 文字・ロゴ・数字・人物・製品の絵を入れない
- タイル状に繰り返しても継ぎ目が目立たない構成
- 正方形`;
}

function genStatus(msg, cls) {
  const el = $("genStatus");
  el.textContent = msg;
  el.className = "gen-status" + (cls ? " " + cls : "");
}

async function callGemini(model, key, prompt, withModalities) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = { contents: [{ parts: [{ text: prompt }] }] };
  if (withModalities) body.generationConfig = { responseModalities: ["TEXT", "IMAGE"] };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const m = json?.error?.message || `${res.status} ${res.statusText}`;
    const err = new Error(m);
    err.status = res.status;
    throw err;
  }
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find(p => p.inlineData?.data);
  if (!inline) {
    const text = parts.map(p => p.text).filter(Boolean).join(" ").slice(0, 200);
    throw new Error(text ? `画像が返りませんでした：${text}` : "画像が返りませんでした。");
  }
  return `data:${inline.inlineData.mimeType || "image/png"};base64,${inline.inlineData.data}`;
}

async function generatePattern() {
  const it = cur(); if (!it) return;
  const prompt = $("genPrompt").value.trim();
  if (!prompt) { genStatus("プロンプトを入力してください。", "err"); return; }

  const key = $("genKey").value.trim() || S.apiKey;
  if (!key) { genStatus("Gemini APIキーを入力してください。", "err"); return; }
  S.apiKey = key;

  const model = $("genModel").value.trim() || "gemini-2.5-flash-image";
  const btn = $("btnGen");
  btn.disabled = true;
  genStatus("生成中…", "busy");

  try {
    let dataUrl;
    try {
      dataUrl = await callGemini(model, key, wrapPrompt(prompt), false);
    } catch (e) {
      /* responseModalities を要求するモデル向けにもう一度 */
      if (/modalit/i.test(e.message) || /画像が返りませんでした/.test(e.message)) {
        dataUrl = await callGemini(model, key, wrapPrompt(prompt), true);
      } else throw e;
    }

    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });

    it.pattern = img;
    it.patternName = prompt.length > 28 ? prompt.slice(0, 28) + "…" : prompt;
    it.prompt = prompt;
    it.mode = "pattern";
    setSeg("dMode", "mode", "pattern");
    $("dColorArea").style.display = "none";
    $("dPatArea").style.display = "";
    refreshPatInfo(); repaintDetail(); refreshCard(it.id);

    genStatus(it.applied
      ? `生成しました（${img.naturalWidth}×${img.naturalHeight}px）。`
      : `生成しました（${img.naturalWidth}×${img.naturalHeight}px）。「反映する」を押すと本体に反映されます。`, "ok");
  } catch (e) {
    genStatus("生成できませんでした：" + e.message, "err");
  } finally {
    btn.disabled = false;
  }
}
$("btnGen").addEventListener("click", generatePattern);
$("genPrompt").addEventListener("input", e => { if (S.current) cur().prompt = e.target.value; });
$("genPrompt").addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generatePattern();
});

$("dPatUp").addEventListener("click", () => pickFile(setPattern));
wireDrop($("dPatUp"), setPattern);
async function setPattern(file) {
  const it = cur(); if (!it) return;
  it.pattern = await loadFile(file);
  it.patternName = file.name;
  it.mode = "pattern";
  setSeg("dMode", "mode", "pattern");
  $("dColorArea").style.display = "none";
  $("dPatArea").style.display = "";
  refreshPatInfo(); repaintDetail(); refreshCard(it.id);
}
$("dPatClear").addEventListener("click", () => {
  const it = cur();
  it.pattern = null; it.patternName = "";
  refreshPatInfo(); repaintDetail(); refreshCard(it.id);
});

document.querySelectorAll("#dFit button").forEach(b => {
  b.addEventListener("click", () => {
    cur().fit = b.dataset.fit;
    setSeg("dFit", "fit", cur().fit);
    repaintDetail(); refreshCard(cur().id);
  });
});
const sliders = [["dScale", "scale", "vScale", v => v + "%"], ["dOffX", "offX", "vOffX", v => v],
                 ["dOffY", "offY", "vOffY", v => v], ["dRot", "rot", "vRot", v => v + "°"]];
for (const [el, key, out, fmt] of sliders) {
  $(el).addEventListener("input", e => {
    cur()[key] = +e.target.value;
    $(out).textContent = fmt(e.target.value);
    repaintDetail(); refreshCard(cur().id);
  });
}

$("dRoomPick").addEventListener("click", () => pickFile(setRoom));
$("dRoomClear").addEventListener("click", () => {
  cur().room = null; refreshRoom(); refreshCard(cur().id);
});
$("dOutline").addEventListener("change", repaintDetail);

/* =========================================================
   一覧の書き出し（A4横 / ブラウザの印刷 → PDFで保存）
   P1        … 全体マップ（10カテゴリー × 10枠）
   P2以降    … 登録のあるカテゴリーごとに 5列×2行
   ========================================================= */
const PRINT = { mapW: 340, cellW: 900 };

function shot(item, w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round(w * (VIEW.y1 - VIEW.y0) / (VIEW.x1 - VIEW.x0));
  paint(c, item, false);
  return c.toDataURL("image/png");
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function buildPrint() {
  const root = $("printRoot");
  root.innerHTML = "";

  const filled = Object.values(S.items).filter(i => i.applied);
  if (!filled.length) {
    alert("登録済みの案がありません。詳細を開いて色や模様を指定し、「反映する」を押してください。");
    return false;
  }
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  /* ---- P1 全体マップ ---- */
  const p1 = el("div", "p-page");
  p1.appendChild(el("div", "p-head",
    `<span class="t">SOLARICH 1000　着せ替えシート 検討一覧</span>
     <span class="s">全体マップ　${CATALOG.length}カテゴリー / ${filled.length}案</span>
     <span class="r">${today}</span>`));

  const map = el("div", "p-map");
  map.appendChild(el("div"));
  for (let i = 1; i <= ITEMS_PER_CATEGORY; i++) map.appendChild(el("div", "colno", String(i).padStart(2, "0")));
  for (const cat of CATALOG) {
    map.appendChild(el("div", "rowlbl", cat.name));
    for (const ci of cat.items) {
      const item = S.items[ci.id];
      if (item.applied) {
        const cell = el("div", "mcell");
        const im = new Image(); im.src = shot(item, PRINT.mapW);
        cell.appendChild(im);
        map.appendChild(cell);
      } else {
        map.appendChild(el("div", "mcell empty"));
      }
    }
  }
  p1.appendChild(map);
  root.appendChild(p1);

  /* ---- カテゴリーページ ---- */
  for (const cat of CATALOG) {
    const items = cat.items.map(ci => S.items[ci.id]).filter(i => i.applied);
    if (!items.length) continue;

    const pg = el("div", "p-page");
    pg.appendChild(el("div", "p-head",
      `<span class="t">${cat.name}</span>
       <span class="s">${items.length}案</span>
       <span class="r">SOLARICH 1000　着せ替えシート 検討一覧　/　${today}</span>`));

    const grid = el("div", "p-grid");
    for (const item of items) {
      const cell = el("div", "p-cell");
      const main = el("div", "p-main");
      const im = new Image(); im.src = shot(item, PRINT.cellW);
      main.appendChild(im);
      cell.appendChild(main);

      const foot = el("div", "p-foot");
      if (item.room) {
        const r = new Image(); r.className = "p-room"; r.src = item.room.src;
        foot.appendChild(r);
      } else {
        foot.appendChild(el("div", "p-room none"));
      }
      const label = item.mode === "pattern" && item.pattern
        ? (item.patternName || "模様")
        : item.hex.toUpperCase();
      foot.appendChild(el("div", "p-txt",
        `<div class="p-no">${String(item.no).padStart(2, "0")}</div>
         <div class="p-name">${item.name || "（名称未設定）"}</div>
         <div class="p-code">${label}</div>`));
      cell.appendChild(foot);
      grid.appendChild(cell);
    }
    pg.appendChild(grid);
    root.appendChild(pg);
  }
  return true;
}

$("btnExport").addEventListener("click", () => {
  if (!S.base || !S.mask) { alert("画像の読み込みが終わっていません。"); return; }
  let ok;
  try { ok = buildPrint(); }
  catch (e) {
    alert("書き出しに失敗しました。静的サーバー経由（http://…）で開いてください。\n" + e.message);
    return;
  }
  if (!ok) return;
  setTimeout(() => window.print(), 120);
});
window.addEventListener("afterprint", () => { $("printRoot").innerHTML = ""; });

/* ベース画像 */
function setBase(img) {
  S.base = img;
  $("basebar").classList.add("ok");
  $("baseLbl").textContent = "ベース画像 読み込み済み";
  $("baseMsg").textContent = `${img.naturalWidth}×${img.naturalHeight}px`;
  Object.keys(S.items).forEach(refreshCard);
  if (S.current) repaintDetail();
}
$("btnBase").addEventListener("click", () => pickFile(async f => setBase(await loadFile(f))));

(function initBase() {
  const img = new Image();
  img.onload = () => setBase(img);
  img.onerror = () => {
    $("baseLbl").textContent = "ベース画像 未設定";
    $("baseMsg").textContent = "assets/base.png が読み込めませんでした。右のボタンから選択してください。";
  };
  img.src = "assets/base.png";
})();

/* 抜き型（cutpass.svg） */
(function initMask() {
  const img = new Image();
  img.onload = () => {
    S.mask = img;
    Object.keys(S.items).forEach(refreshCard);
    if (S.current) repaintDetail();
  };
  img.onerror = () => {
    $("baseLbl").textContent = "抜き型データが読めません";
    $("baseMsg").textContent = "assets/cutpass.svg が見つかりません。";
  };
  img.src = "assets/cutpass.svg";
})();

buildCatalog();
