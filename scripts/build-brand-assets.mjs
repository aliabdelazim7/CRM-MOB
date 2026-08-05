/**
 * توليد أصول الهوية — التشغيل: npm run brand
 *
 * بيطلّع:
 *   public/favicon.ico   أيقونة متعددة المقاسات (16/32/48) للمتصفحات القديمة
 *   public/og-image.png  صورة معاينة الرابط 1200×630
 *
 * راستر مكتوب بالإيد على zlib المدمج في Node — من غير أي اعتمادية خارجية
 * (sharp/canvas بيجروا بينري تقيل ورا الحتة كلها دي عشان صورتين).
 *
 * إحداثيات المونوجرام لازم تفضل مطابقة لـ public/logo.svg.
 */
import zlib from 'node:zlib';
import fs from 'node:fs';

// ── ترميز PNG ────────────────────────────────────────────────────────────────
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── فك ترميز PNG (اللي محتاجينه: 8-bit RGB/RGBA/palette) ─────────────────────
function decodePNG(buf) {
  let pos = 8, w = 0, h = 0, depth = 0, ctype = 0, idat = [], plte = null, trns = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9];
    } else if (type === 'PLTE') plte = Buffer.from(data);
    else if (type === 'tRNS') trns = Buffer.from(data);
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (depth !== 8) throw new Error(`عمق بت غير مدعوم: ${depth}`);
  const chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!chans) throw new Error(`نوع لون غير مدعوم: ${ctype}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * chans;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= chans ? cur[x - chans] : 0, b = prev[x], c = x >= chans ? prev[x - chans] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
    cur.copy(out, y * stride); prev = cur;
  }
  // تحويل لـ RGBA
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a = 255;
    if (ctype === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3]; }
    else if (ctype === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; }
    else if (ctype === 0) { r = g = b = out[i]; }
    else if (ctype === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1]; }
    else { const p = out[i]; r = plte[p * 3]; g = plte[p * 3 + 1]; b = plte[p * 3 + 2]; if (trns && p < trns.length) a = trns[p]; }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { w, h, rgba };
}

// ── رسم الأشكال (supersampling ×4 للحواف الناعمة) ────────────────────────────
const SS = 4;
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

/** هل النقطة جوه المضلّعات؟ (even-odd زي fill-rule بتاع SVG) */
function insidePolys(polys, x, y) {
  let inside = false;
  for (const pts of polys) {
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
function insideRoundRect(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  const cx = Math.min(Math.max(x, r), w - r), cy = Math.min(Math.max(y, r), h - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r || (x >= r && x <= w - r) || (y >= r && y <= h - r);
}

/** المونوجرام: نفس إحداثيات public/logo.svg بالظبط. */
const A_OUTER = [[246,108],[266,108],[390,378],[414,378],[414,400],[306,400],[306,378],[330,378],[304,322],[208,322],[182,378],[206,378],[206,400],[98,400],[98,378],[122,378]];
const A_COUNTER = [[256,176],[298,276],[214,276]];

function renderMonogram(size, bgHex, fgHex, radiusRatio = 112 / 512) {
  const [br, bg_, bb] = hex(bgHex), [fr, fg, fb] = hex(fgHex);
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 512, r = size * radiusRatio;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inBg = 0, inFg = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        if (insideRoundRect(px, py, size, size, r)) inBg++;
        if (insidePolys([A_OUTER, A_COUNTER], px / s, py / s)) inFg++;
      }
      const n = SS * SS, ab = inBg / n, af = (inFg / n) * ab;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(br * (ab - af) + fr * af + 0);
      rgba[i + 1] = Math.round(bg_ * (ab - af) + fg * af);
      rgba[i + 2] = Math.round(bb * (ab - af) + fb * af);
      rgba[i + 3] = Math.round(ab * 255);
    }
  }
  return { size, rgba };
}

// ── التنفيذ ──────────────────────────────────────────────────────────────────
const OUT = process.argv[2] || 'public';
const CREAM = '#F8EEE2', INK = '#0D0D0D';

// صورة الرابط 1200×630: لوجو ADRIA STORE الحالي على خلفية بنفس لون خلفيته
const src = decodePNG(fs.readFileSync('public/pwa-512x512.png'));

// الصورة الأصلية حواليها إطار بلون مختلف شوية. بنقصّه، وبناخد لون الخلفية
// الداخلية نفسه للكانفاس عشان مايبانش خط فاصل حوالين المربع.
const BORDER = 14;
const px = (x, y) => { const i = (y * src.w + x) * 4; return [src.rgba[i], src.rgba[i + 1], src.rgba[i + 2]]; };
const [cr, cg, cb] = px(BORDER + 6, BORDER + 6);
console.log('لون الخلفية المسحوب من الصورة:', `#${[cr,cg,cb].map(v=>v.toString(16).padStart(2,'0')).join('')}`);

const W = 1200, H = 630;
const og = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) { og[i * 4] = cr; og[i * 4 + 1] = cg; og[i * 4 + 2] = cb; og[i * 4 + 3] = 255; }
const target = 500, ox = ((W - target) / 2) | 0, oy = ((H - target) / 2) | 0;
const CROP = BORDER, cw = src.w - CROP * 2;
for (let y = 0; y < target; y++) {
  for (let x = 0; x < target; x++) {
    const sx = CROP + Math.min(cw - 1, ((x * cw) / target) | 0);
    const sy = CROP + Math.min(cw - 1, ((y * cw) / target) | 0);
    const si = (sy * src.w + sx) * 4, di = ((oy + y) * W + (ox + x)) * 4;
    const a = src.rgba[si + 3] / 255;
    og[di] = Math.round(src.rgba[si] * a + og[di] * (1 - a));
    og[di + 1] = Math.round(src.rgba[si + 1] * a + og[di + 1] * (1 - a));
    og[di + 2] = Math.round(src.rgba[si + 2] * a + og[di + 2] * (1 - a));
  }
}
fs.writeFileSync(`${OUT}/og-image.png`, encodePNG(W, H, og));
console.log('src png:', src.w + 'x' + src.h, '| og-image.png 1200x630 | previews written');

// ── favicon.ico ──────────────────────────────────────────────────────────────
// vite.config.ts كان بيشاور على favicon.ico في includeAssets وهي مش موجودة أصلاً.
// ICO الحديثة بتسمح بتضمين PNG جوّاها مباشرةً.
function buildIco(sizes) {
  const pngs = sizes.map((sz) => {
    const m = renderMonogram(sz, CREAM, INK, 0); // بدون تدوير: الأيقونة صغيرة والتدوير بياكل منها
    return encodePNG(sz, sz, m.rgba);
  });
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = [];
  sizes.forEach((sz, i) => {
    const e = Buffer.alloc(16);
    e[0] = sz >= 256 ? 0 : sz; e[1] = sz >= 256 ? 0 : sz;
    e[2] = 0; e[3] = 0;
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
    offset += pngs[i].length; dir.push(e);
  });
  return Buffer.concat([header, ...dir, ...pngs]);
}
fs.writeFileSync(`${OUT}/favicon.ico`, buildIco([16, 32, 48]));
console.log('favicon.ico written (16/32/48)');
