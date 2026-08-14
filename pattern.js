"use strict";
/* =========================================================
   プロンプト（キーワード）から柄を描く
   外部APIを使わず、ブラウザ内で完結する
   ========================================================= */
const PATTERN = (() => {

  /* ---------- 乱数（プロンプトから決まるので同じ入力なら同じ柄） ---------- */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFrom(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  /* ---------- 色 ---------- */
  const COLORS = [
    ["オフホワイト", "#F5F3EE"], ["アイボリー", "#EFEAE1"], ["生成り", "#EFE7D8"], ["白", "#F7F5F1"],
    ["チャコール", "#3A3A38"], ["黒", "#1E1E1E"], ["ブラック", "#1E1E1E"],
    ["ライトグレー", "#C9C6C0"], ["ダークグレー", "#55524E"], ["グレージュ", "#B5ADA1"],
    ["グレー", "#8E8880"], ["グレイ", "#8E8880"], ["シルバー", "#C0C3C6"],
    ["ネイビー", "#22304A"], ["紺", "#22304A"], ["インディゴ", "#3B5578"],
    ["ターコイズ", "#1FA8A0"], ["スカイブルー", "#6FB5DE"], ["水色", "#7FBEE0"],
    ["ブルー", "#2A6FD6"], ["青", "#2A6FD6"],
    ["フォレストグリーン", "#3F7A55"], ["深緑", "#2F5D46"], ["セージ", "#9CAA90"],
    ["オリーブ", "#7C7B4F"], ["ライム", "#8DC63F"], ["カーキ", "#8A8259"],
    ["グリーン", "#3F8F5E"], ["緑", "#3F8F5E"],
    ["マスタード", "#C79A3C"], ["ゴールド", "#B99A5B"], ["イエロー", "#F3BE18"], ["黄", "#F3BE18"],
    ["テラコッタ", "#B85C38"], ["オレンジ", "#EE7A20"], ["橙", "#EE7A20"],
    ["キャメル", "#B0793F"], ["ベージュ", "#D9C7A7"], ["サンド", "#D9C7A7"],
    ["ブラウン", "#6B5346"], ["茶", "#6B5346"], ["カッパー", "#A9673F"], ["銅", "#A9673F"],
    ["サーモン", "#F0A08C"], ["コーラル", "#F27A62"], ["ピンク", "#E9A7A3"], ["桜", "#F0C6D0"],
    ["モーヴ", "#9B8195"], ["パープル", "#7B5EA7"], ["紫", "#7B5EA7"], ["藤", "#A9A0CE"],
    ["ワインレッド", "#7E2B33"], ["レッド", "#C9382F"], ["赤", "#C9382F"]
  ];

  const hex2rgb = h => {
    const s = h.replace("#", "");
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  };
  const rgb2hex = c => "#" + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

  function rgb2hsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const l = (mx + mn) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return [h, s, l];
  }
  function hsl2rgb([h, s, l]) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }
  function adjust(hex, { s = 1, l = 1, dl = 0 } = {}) {
    const h = rgb2hsl(hex2rgb(hex));
    h[1] = Math.max(0, Math.min(1, h[1] * s));
    h[2] = Math.max(0.02, Math.min(0.98, h[2] * l + dl));
    return rgb2hex(hsl2rgb(h));
  }
  const mix = (a, b, t) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
  const lum = hex => { const [r, g, b] = hex2rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

  /* ---------- 柄の種類 ---------- */
  const TYPES = [
    ["marble",     ["大理石", "マーブル", "marble"]],
    ["wood",       ["木目", "木", "ウッド", "wood", "オーク", "ウォールナット", "チーク"]],
    ["terrazzo",   ["テラゾー", "terrazzo", "人研ぎ"]],
    ["camo",       ["カモ", "迷彩", "camo"]],
    ["denim",      ["デニム", "denim", "ジーンズ", "ダンガリー"]],
    ["linen",      ["リネン", "麻布", "linen", "キャンバス", "布", "ファブリック", "織"]],
    ["concrete",   ["コンクリート", "セメント", "concrete", "モルタル"]],
    ["seigaiha",   ["青海波", "波", "wave", "うろこ"]],
    ["asanoha",    ["麻の葉", "asanoha", "和柄"]],
    ["herringbone",["ヘリンボーン", "herringbone", "杉綾"]],
    ["triangle",   ["トライアングル", "三角", "幾何", "ジオメトリック", "geometric"]],
    ["gingham",    ["ギンガム", "チェック", "格子", "タータン", "check", "plaid"]],
    ["dots",       ["ドット", "水玉", "dot", "polka"]],
    ["border",     ["ボーダー", "横縞", "border"]],
    ["stripe",     ["ストライプ", "縦縞", "縞", "stripe"]],
    ["gradient",   ["グラデーション", "gradient", "ぼかし"]],
    ["grain",      ["ノイズ", "グレイン", "ざらざら", "grain", "テクスチャ"]],
    ["solid",      ["無地", "単色", "ソリッド", "solid"]]
  ];

  /* ---------- プロンプト解析 ---------- */
  function parse(prompt, baseHex) {
    const p = String(prompt || "");

    let type = null;
    for (const [key, words] of TYPES) {
      if (words.some(w => p.includes(w))) { type = key; break; }
    }

    /* 色：先に #RRGGBB、次に色名（長い名前を優先） */
    const colors = [];
    (p.match(/#[0-9a-fA-F]{6}/g) || []).forEach(h => colors.push(h.toUpperCase()));
    for (const [name, hex] of COLORS) {
      if (p.includes(name) && !colors.includes(hex)) colors.push(hex);
      if (colors.length >= 4) break;
    }
    if (!colors.length && baseHex) colors.push(baseHex);

    /* トーン */
    let tone = null;
    if (/くすん|スモーキー|ダスティ|渋/.test(p)) tone = "muted";
    else if (/淡い|ペール|パステル|薄/.test(p)) tone = "pale";
    else if (/濃い|ダーク|深い|暗/.test(p)) tone = "dark";
    else if (/ビビッド|鮮やか|派手|明る/.test(p)) tone = "vivid";
    else if (/落ち着|上品|シック|ナチュラル/.test(p)) tone = "calm";
    if (/モノトーン|白黒|グレースケール/.test(p)) tone = "mono";

    /* 大きさ */
    let scale = 1;
    if (/細かい|小さい|細い|ミニ|小柄/.test(p)) scale = 0.6;
    if (/大きい|太い|大柄|ビッグ|粗い/.test(p)) scale = 1.7;

    /* 向き */
    const diagonal = /斜め|ダイアゴナル|diagonal/.test(p);

    return { type: type || (colors.length > 1 ? "stripe" : "grain"), colors, tone, scale, diagonal, prompt: p };
  }

  /* トーンを反映したパレットを作る */
  function palette(spec, rnd) {
    let cols = spec.colors.slice();
    if (!cols.length) cols = ["#8E8880"];

    const t = spec.tone;
    const tune = h => {
      if (t === "muted") return adjust(h, { s: 0.55, l: 0.95 });
      if (t === "pale")  return adjust(h, { s: 0.55, dl: 0.16 });
      if (t === "dark")  return adjust(h, { s: 1.05, l: 0.72 });
      if (t === "vivid") return adjust(h, { s: 1.45 });
      if (t === "calm")  return adjust(h, { s: 0.75, l: 0.96 });
      if (t === "mono")  { const g = lum(h); return rgb2hex([g * 255, g * 255, g * 255]); }
      return h;
    };
    cols = cols.map(tune);

    /* 1色しか指定がなければ、同系の濃淡を足す */
    if (cols.length === 1) {
      const base = cols[0];
      const light = lum(base) > 0.55;
      cols.push(light ? adjust(base, { l: 0.82, s: 1.1 }) : adjust(base, { dl: 0.22, s: 0.9 }));
    }
    if (cols.length === 2) cols.push(mix(cols[0], cols[1], 0.5));
    return cols;
  }

  /* ---------- 継ぎ目のできないノイズ ---------- */
  function makeNoise(period, rnd) {
    const g = new Float32Array(period * period);
    for (let i = 0; i < g.length; i++) g[i] = rnd();
    const sm = t => t * t * (3 - 2 * t);
    return (x, y) => {
      const fx = x * period, fy = y * period;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = sm(fx - x0), ty = sm(fy - y0);
      const i0 = ((x0 % period) + period) % period, i1 = (i0 + 1) % period;
      const j0 = ((y0 % period) + period) % period, j1 = (j0 + 1) % period;
      const a = g[j0 * period + i0], b = g[j0 * period + i1];
      const c = g[j1 * period + i0], d = g[j1 * period + i1];
      return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
    };
  }
  function makeFbm(rnd, base) {
    const n = [makeNoise(base, rnd), makeNoise(base * 2, rnd), makeNoise(base * 4, rnd), makeNoise(base * 8, rnd)];
    return (x, y, oct = 4) => {
      let v = 0, amp = 0.5, sum = 0;
      for (let i = 0; i < oct; i++) { v += n[i](x, y) * amp; sum += amp; amp *= 0.5; }
      return v / sum;
    };
  }

  /* ---------- 各パターン ---------- */
  const R = {};

  R.solid = (g, N, c) => { g.fillStyle = c[0]; g.fillRect(0, 0, N, N); };

  R.stripe = (g, N, c, s) => {
    const n = Math.max(3, Math.round(9 / s.scale));
    const w = N / n;
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.fillStyle = c[1];
    for (let i = 0; i < n; i++) g.fillRect(i * w, 0, w * 0.5, N);
    if (s.colors.length > 2) {
      g.fillStyle = c[2];
      for (let i = 0; i < n; i++) g.fillRect(i * w + w * 0.62, 0, w * 0.12, N);
    }
  };

  R.border = (g, N, c, s) => {
    g.save(); g.translate(N, 0); g.rotate(Math.PI / 2);
    R.stripe(g, N, c, s);
    g.restore();
  };

  R.gingham = (g, N, c, s) => {
    const n = Math.max(3, Math.round(7 / s.scale));
    const w = N / n;
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.globalAlpha = 0.55; g.fillStyle = c[1];
    for (let i = 0; i < n; i++) g.fillRect(i * w, 0, w * 0.5, N);
    for (let i = 0; i < n; i++) g.fillRect(0, i * w, N, w * 0.5);
    g.globalAlpha = 1;
    if (s.colors.length > 2) {
      g.strokeStyle = c[2]; g.lineWidth = Math.max(1, N / 400);
      for (let i = 0; i < n; i++) {
        g.beginPath(); g.moveTo(i * w + w * 0.75, 0); g.lineTo(i * w + w * 0.75, N); g.stroke();
        g.beginPath(); g.moveTo(0, i * w + w * 0.75); g.lineTo(N, i * w + w * 0.75); g.stroke();
      }
    }
  };

  R.dots = (g, N, c, s) => {
    const n = Math.max(3, Math.round(7 / s.scale));
    const cell = N / n, r = cell * 0.21;
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.fillStyle = c[1];
    for (let row = -1; row <= n; row++) {
      for (let col = -1; col <= n; col++) {
        const x = col * cell + (row % 2 ? cell * 0.5 : 0) + cell * 0.5;
        const y = row * cell + cell * 0.5;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
  };

  R.triangle = (g, N, c, s, rnd) => {
    const n = Math.max(3, Math.round(6 / s.scale));
    const w = N / n, h = N / n;
    const pal = [c[0], c[1], c[2]];
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * w, y = row * h;
        /* セルを対角線で2枚に割り、割る向きも色も市松+乱数で散らす */
        const flip = ((row + col) % 2 === 0) !== (rnd() < 0.25);
        const k = (row * 5 + col * 7) % 3;
        const tris = flip
          ? [[[x, y], [x + w, y], [x, y + h]], [[x + w, y], [x + w, y + h], [x, y + h]]]
          : [[[x, y], [x + w, y], [x + w, y + h]], [[x, y], [x + w, y + h], [x, y + h]]];
        tris.forEach((t, i) => {
          g.fillStyle = pal[(k + i + (i ? 1 : 0)) % 3];
          g.beginPath(); g.moveTo(t[0][0], t[0][1]); g.lineTo(t[1][0], t[1][1]); g.lineTo(t[2][0], t[2][1]);
          g.closePath(); g.fill();
        });
      }
    }
  };

  R.herringbone = (g, N, c, s) => {
    /* 45度に倒した座標で「横板→縦板」を階段状に並べる（杉綾） */
    const W = (N / Math.max(5, Math.round(11 / s.scale)));   // 板の幅
    const L = W * 2;                                          // 板の長さ
    const D = N * 1.5;                                        // 回転しても埋まる範囲
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.save();
    g.translate(N / 2, N / 2); g.rotate(Math.PI / 4); g.translate(-D / 2, -D / 2);
    const rows = Math.ceil(D / W) + 2;
    /* 行ごとに x が -j*W ずれるので、その分だけ列を余分に回す */
    const cols = Math.ceil(D / L) + Math.ceil(rows * W / L) + 2;
    const gap = Math.max(1, W * 0.09);
    const tone = mix(c[1], c[2], 0.4);
    /* 板ごとの濃淡は市松にすると斜めの帯に見えるので、ハッシュで散らす */
    const pick = (i, j) => ((Math.imul(i + 997, 73856093) ^ Math.imul(j + 991, 19349663)) >>> 0) % 2 ? c[1] : tone;
    for (let j = -rows; j < rows; j++) {
      for (let i = -cols; i < cols; i++) {
        const x = i * L - j * W, y = j * W;
        g.fillStyle = pick(i, j);
        g.fillRect(x, y, L - gap, W - gap);                   // 横板
        g.fillStyle = pick(i + 31, j + 17);
        g.fillRect(x + L, y - W, W - gap, L - gap);           // 縦板
      }
    }
    g.restore();
  };

  R.seigaiha = (g, N, c, s) => {
    const n = Math.max(3, Math.round(6 / s.scale));
    const r = N / n;
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.lineWidth = Math.max(1.2, r * 0.055);
    for (let row = -1; row <= n * 2 + 1; row++) {
      for (let col = -1; col <= n + 1; col++) {
        const x = col * r + (row % 2 ? r * 0.5 : 0);
        const y = row * r * 0.5;
        for (let k = 3; k >= 1; k--) {
          g.strokeStyle = k % 2 ? c[1] : c[2];
          g.beginPath(); g.arc(x, y, r * (k / 3.2), Math.PI, 0); g.stroke();
        }
      }
    }
  };

  R.asanoha = (g, N, c, s) => {
    const n = Math.max(3, Math.round(6 / s.scale));
    const u = N / n;
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    g.strokeStyle = c[1]; g.lineWidth = Math.max(1, u * 0.045); g.lineCap = "round";
    const h = u * Math.sqrt(3) / 2;
    for (let row = -1; row <= n * 2 + 1; row++) {
      for (let col = -1; col <= n + 1; col++) {
        const cx = col * u + (row % 2 ? u * 0.5 : 0);
        const cy = row * h;
        for (let k = 0; k < 6; k++) {
          const a1 = k * Math.PI / 3, a2 = (k + 1) * Math.PI / 3;
          const x1 = cx + Math.cos(a1) * u * 0.5, y1 = cy + Math.sin(a1) * u * 0.5;
          const x2 = cx + Math.cos(a2) * u * 0.5, y2 = cy + Math.sin(a2) * u * 0.5;
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
          g.beginPath(); g.moveTo(cx, cy); g.lineTo(x1, y1); g.stroke();
        }
      }
    }
  };

  R.gradient = (g, N, c, s) => {
    const gr = s.diagonal ? g.createLinearGradient(0, 0, N, N) : g.createLinearGradient(0, 0, 0, N);
    gr.addColorStop(0, c[0]);
    if (c.length > 2) gr.addColorStop(0.5, c[2]);
    gr.addColorStop(1, c[1]);
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
  };

  R.terrazzo = (g, N, c, s, rnd) => {
    g.fillStyle = c[0]; g.fillRect(0, 0, N, N);
    const count = Math.round(420 / (s.scale * s.scale));
    const chips = c.slice(1).concat([adjust(c[0], { l: 0.72 }), adjust(c[1], { dl: 0.15 })]);
    for (let i = 0; i < count; i++) {
      const x = rnd() * N, y = rnd() * N, r = (N / 46) * (0.5 + rnd()) * s.scale;
      g.fillStyle = chips[(i * 7) % chips.length];
      /* 画面端をまたぐぶんも描いて継ぎ目を消す */
      for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
        if (Math.abs(x + dx - N / 2) > N || Math.abs(y + dy - N / 2) > N) continue;
        g.save(); g.translate(x + dx, y + dy); g.rotate(rnd() * Math.PI);
        g.beginPath();
        const v = 5 + Math.floor(rnd() * 3);
        for (let k = 0; k < v; k++) {
          const a = (k / v) * Math.PI * 2, rr = r * (0.7 + rnd() * 0.6);
          k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        g.closePath(); g.fill(); g.restore();
      }
    }
  };

  /* --- ピクセル単位で描くもの --- */
  function pixels(g, N, fn) {
    const im = g.createImageData(N, N), d = im.data;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const c = fn(x / N, y / N);
        const i = (y * N + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(im, 0, 0);
  }

  R.marble = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 4);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]), C = hex2rgb(c[2]);
    const freq = 3.2 / s.scale;
    pixels(g, N, (x, y) => {
      const w = f(x, y) * 2 - 1;
      const v = Math.sin((x * freq + w * 2.4) * Math.PI * 2) * 0.5 + 0.5;
      const vein = Math.pow(1 - Math.abs(v * 2 - 1), 8);
      const grain = (f(x * 3, y * 3, 3) - 0.5) * 22;
      const base = A.map((a, i) => a + (B[i] - a) * (0.25 + f(x, y, 2) * 0.5));
      return base.map((b, i) => b + (C[i] - b) * vein * 0.85 + grain);
    });
  };

  R.wood = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 4);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]);
    const rings = 7 / s.scale;                 // 年輪の本数
    pixels(g, N, (x, y) => {
      /* 木目は横方向に走る。年輪は y 方向に緩やかに歪む */
      const warp = (f(x * 0.6, y * 0.3, 3) - 0.5) * 0.13;
      const ring = Math.abs(Math.sin((y + warp) * rings * Math.PI));
      const edge = Math.pow(ring, 2.6);        // 濃い線を細く締める
      const streak = (f(x * 2.2, y * 34, 3) - 0.5) * 0.22;   // 導管の細い筋
      const k = Math.min(1, Math.max(0, edge * 0.8 + streak + 0.12));
      const grain = (f(x * 50, y * 7, 2) - 0.5) * 9;
      return A.map((a, i) => a + (B[i] - a) * k + grain);
    });
  };

  R.camo = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 3);
    const pal = [c[0], c[1], c[2], adjust(c[1], { l: 0.6 })].map(hex2rgb);
    const z = 1 / s.scale;
    pixels(g, N, (x, y) => {
      const v = f(x * z, y * z, 3);
      const i = v < 0.4 ? 0 : v < 0.55 ? 1 : v < 0.72 ? 2 : 3;
      return pal[i];
    });
  };

  R.concrete = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 6);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]);
    pixels(g, N, (x, y) => {
      const v = f(x, y, 4);
      const speck = (f(x * 20, y * 20, 2) - 0.5) * 34;
      return A.map((a, i) => a + (B[i] - a) * (v * 0.55) + speck);
    });
  };

  R.denim = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 8);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]);
    const tw = 260 / s.scale;
    pixels(g, N, (x, y) => {
      const twill = ((x * tw + y * tw) % 3) < 1.2 ? 1 : 0;
      const fade = f(x, y, 3) * 0.35;
      const noise = (f(x * 30, y * 30, 2) - 0.5) * 26;
      return A.map((a, i) => a + (B[i] - a) * (twill * 0.35 + fade) + noise);
    });
  };

  R.linen = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 8);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]);
    const th = 210 / s.scale;
    pixels(g, N, (x, y) => {
      const wx = Math.sin(x * th) * 0.5 + 0.5, wy = Math.sin(y * th) * 0.5 + 0.5;
      const weave = (wx * 0.5 + wy * 0.5);
      const noise = (f(x * 14, y * 14, 3) - 0.5) * 20;
      return A.map((a, i) => a + (B[i] - a) * weave * 0.5 + noise);
    });
  };

  R.grain = (g, N, c, s, rnd) => {
    const f = makeFbm(rnd, 8);
    const A = hex2rgb(c[0]), B = hex2rgb(c[1]);
    pixels(g, N, (x, y) => {
      const v = f(x * 4, y * 4, 4);
      const n = (f(x * 26, y * 26, 2) - 0.5) * 30;
      return A.map((a, i) => a + (B[i] - a) * v * 0.35 + n);
    });
  };

  /* ---------- 生成 ---------- */
  function generate(prompt, baseHex, variant = 0, size = 1024) {
    const spec = parse(prompt, baseHex);
    const rnd = rngFrom(hash(prompt + "::" + variant));
    const c = palette(spec, rnd);

    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const g = cv.getContext("2d");
    (R[spec.type] || R.grain)(g, size, c, spec, rnd);

    const label = (TYPES.find(t => t[0] === spec.type) || [null, ["柄"]])[1][0];
    return { canvas: cv, spec, colors: c, label };
  }

  return { generate, parse, TYPES, COLORS };
})();
