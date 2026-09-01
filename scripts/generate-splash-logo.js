/**
 * scripts/generate-splash-logo.js
 *
 * بيولّد علامة "سوق مصر" البصرية كـPNG شفاف أبيض (assets/splash-logo.png)
 * عشان تتحط فوق خلفية الـsplash الحمرا. الشكل نفسه: قوس مدبّب (two-centered
 * arch) — دي حرفيًا عمارة السوق المغطّى/الوكالة المصرية، مش شكل هندسي عام —
 * وجوّاه دايرة مصمتة كأنها فانوس معلّق، وهي كمان النقطة اللي في الوردمارك
 * "سوق مصر." الموجودة أصلًا في welcome.tsx وhome.tsx.
 *
 * ليه سكربت مش ملف صورة جاهز: مفيش لوجو حقيقي في المشروع أصلًا (الأصول
 * الموجودة كانت قوالب Expo الافتراضية)، والرسم هندسي بحت فينفع يتولّد
 * بدقة بدل ما يتلفّق. بيستخدم zlib بتاع Node بس — من غير أي اعتمادية جديدة.
 *
 * التشغيل: node scripts/generate-splash-logo.js
 * (بيتشغّل مرة واحدة وقت التصميم — الناتج PNG بيتحفظ في الريبو ومش
 * محتاج يتولّد تاني وقت الـbuild.)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// الكانفس مقصوص على نسبة القوس نفسه (مش مربع) — لو كان مربع، `contain`
// بيسيب فراغ شفاف على الجنبين وبيعمل مسافة غريبة جنب النص في اللوك-أب.
const OUT_H = 1024;
const SS = 4; // supersampling للحواف الناعمة

// ---- هندسة القوس المدبّب ----
// نصف العرض = 1، خط الانطلاق (springing line) عند y = 0.
// قوسان نصف قطرهما R ومركزاهما عند (±(R-1), 0) بيتقابلوا في قمة مدبّبة.
const R = 2.0;
const CX = R - 1.0; // = 1.0 → مركز القوس الأيسر عند (+1, 0)
const APEX_Y = Math.sqrt(R * R - CX * CX); // = √3 ≈ 1.732
const LEG = 1.05; // ارتفاع الرجلين تحت خط الانطلاق
const STROKE = 0.17; // نصف سُمك الخط
const LANTERN_R = 0.30; // نصف قطر الفانوس
const LANTERN_Y = 0.62; // ارتفاع الفانوس جوّه القوس

// حدود الشكل شاملة السُمك
const MIN_X = -1 - STROKE;
const MAX_X = 1 + STROKE;
const MIN_Y = -LEG - STROKE;
const MAX_Y = APEX_Y + STROKE;

const CONTENT_W = MAX_X - MIN_X; // 2.34
const CONTENT_H = MAX_Y - MIN_Y; // 3.122
const MARGIN = 0.985; // هامش بسيط عشان تنعيم الحواف ميتقصّش

const scale = (OUT_H * MARGIN) / CONTENT_H;
const OUT_W = Math.round((CONTENT_W / CONTENT_H) * OUT_H);
const cxNorm = (MIN_X + MAX_X) / 2;
const cyNorm = (MIN_Y + MAX_Y) / 2;

/** إحداثيات البكسل → إحداثيات الشكل (y لفوق) */
function toShape(px, py) {
  return {
    x: (px - OUT_W / 2) / scale + cxNorm,
    y: -(py - OUT_H / 2) / scale + cyNorm,
  };
}

function distToSegment(x, y, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * المسافة لقوس دائري: لو الزاوية جوه المدى بنرجّع |d - R|، غير كده
 * أقرب طرف. الزوايا بالراديان.
 */
function distToArc(x, y, ccx, ccy, r, a0, a1) {
  const dx = x - ccx;
  const dy = y - ccy;
  let ang = Math.atan2(dy, dx);
  if (ang < 0) ang += 2 * Math.PI;
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  if (ang >= lo && ang <= hi) return Math.abs(Math.hypot(dx, dy) - r);
  const p0 = [ccx + r * Math.cos(a0), ccy + r * Math.sin(a0)];
  const p1 = [ccx + r * Math.cos(a1), ccy + r * Math.sin(a1)];
  return Math.min(Math.hypot(x - p0[0], y - p0[1]), Math.hypot(x - p1[0], y - p1[1]));
}

/** المسافة لمسار القوس كله (رجلين + قوسين) */
function distToArch(x, y) {
  // الرجل اليسرى: x = -1، من y = -LEG لـ y = 0
  const dLegL = distToSegment(x, y, -1, -LEG, -1, 0);
  const dLegR = distToSegment(x, y, 1, -LEG, 1, 0);

  // القوس الأيسر: مركزه (+CX, 0)، من (-1,0) [180°] لـ (0, APEX_Y) [120°]
  const aStartL = Math.PI; // 180°
  const aEndL = Math.atan2(APEX_Y, -CX); // ≈ 120°
  const dArcL = distToArc(x, y, CX, 0, R, aEndL, aStartL);

  // القوس الأيمن: مركزه (-CX, 0)، من (0, APEX_Y) [60°] لـ (1,0) [0°]
  const aStartR = 0;
  const aEndR = Math.atan2(APEX_Y, CX); // ≈ 60°
  const dArcR = distToArc(x, y, -CX, 0, R, aStartR, aEndR);

  return Math.min(dLegL, dLegR, dArcL, dArcR);
}

/** تغطية البكسل [0..1] */
function coverage(px, py) {
  let hits = 0;
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      const { x, y } = toShape(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS);
      const dArch = distToArch(x, y) - STROKE;
      const dLantern = Math.hypot(x, y - LANTERN_Y) - LANTERN_R;
      if (Math.min(dArch, dLantern) <= 0) hits++;
    }
  }
  return hits / (SS * SS);
}

// ---- ترميز PNG (RGBA، من غير اعتماديات) ----
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- الرسم ----
const rgba = Buffer.alloc(OUT_W * OUT_H * 4);
for (let py = 0; py < OUT_H; py++) {
  for (let px = 0; px < OUT_W; px++) {
    const a = Math.round(coverage(px, py) * 255);
    const i = (py * OUT_W + px) * 4;
    rgba[i] = 255; // أبيض صافي
    rgba[i + 1] = 255;
    rgba[i + 2] = 255;
    rgba[i + 3] = a;
  }
}

const outPath = path.join(__dirname, '..', 'assets', 'splash-logo.png');
fs.writeFileSync(outPath, encodePng(OUT_W, OUT_H, rgba));
console.log(`wrote ${outPath} (${OUT_W}x${OUT_H}, aspect ${(OUT_W / OUT_H).toFixed(4)})`);
