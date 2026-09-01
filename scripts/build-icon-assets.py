"""
build-icon-assets.py — يبني كل أصول الأيقونة/السبلاش من صورة SOUQ اللي
بعتها المستخدم بالظبط (c2632c50-image.jpg), من غير أي إعادة تصميم:
- يقصّ اللوجو من الخلفية البيضا المختارة (مش النسخة السودا).
- بيبني: icon.png (مربع أبيض مسطّح), android foreground/background/
  monochrome (adaptive icon), favicon.png, وصورة أبيض شفافة لل splash.
- مفيش تلوين/تعديل على شكل اللوجو أو لونه الأحمر — نفس البكسلات
  الأصلية بتتقصّ وتتكبّر بس (Lanczos) عشان تدخل في المقاسات المطلوبة.
"""
from PIL import Image
import os

SRC = r"C:\Users\LENOVO\.claude\uploads\97f7b61f-ade1-4f1a-8d39-17ffeefbb324\c2632c50-image.jpg"
OUT = "assets"

src = Image.open(SRC).convert("RGB")

# قصّ منطقة اللوجو من التايل الأبيض (تحديد بالفحص اليدوي للبكسلات:
# اللوجو 52-566 × 211-366 جوه التايل الأبيض 26-608 × 14-583).
# هامش صغير حوالين اللوجو عشان نمسك حواف الـanti-aliasing كاملة.
LX0, LY0, LX1, LY1 = 28, 187, 590, 390
logo_crop = src.crop((LX0, LY0, LX1, LY1))
LOGO_W, LOGO_H = logo_crop.size
print("logo crop size:", logo_crop.size, "aspect:", LOGO_W / LOGO_H)


def alpha_mask_from_white_bg(img_rgb):
    """بيرجع نفس الصورة كـ RGBA: alpha بيتحسب من بعد كل بكسل عن الأبيض
    الخلفية (253~254) — أي بكسل أبيض صافي بيبقى شفاف, أي بكسل أحمر
    (اللوجو) بيبقى صلب, وحواف الـAA بتاخد قيم نص-شفافة تلقائيًا."""
    w, h = img_rgb.size
    px = img_rgb.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    WHITE_HI = 248.0  # فوق كده = شفاف تمامًا
    RED_LO = 40.0     # تحت كده = صلب تمامًا
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            m = min(r, g, b)
            if m >= WHITE_HI:
                a = 0
            elif m <= RED_LO:
                a = 255
            else:
                a = round((WHITE_HI - m) / (WHITE_HI - RED_LO) * 255)
            opx[x, y] = (r, g, b, a)
    return out


def recolor_white(img_rgba):
    w, h = img_rgba.size
    px = img_rgba.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opx = out.load()
    for y in range(h):
        for x in range(w):
            _, _, _, a = px[x, y]
            opx[x, y] = (255, 255, 255, a)
    return out


def paste_centered(canvas, art, target_w):
    """بيحط art جوه canvas في النص, بمقاس target_w عرض (يحافظ على النسبة)."""
    aw, ah = art.size
    scale = target_w / aw
    th = round(ah * scale)
    art_r = art.resize((target_w, th), Image.LANCZOS)
    cw, ch = canvas.size
    ox = (cw - target_w) // 2
    oy = (ch - th) // 2
    if art_r.mode == "RGBA":
        canvas.paste(art_r, (ox, oy), art_r)
    else:
        canvas.paste(art_r, (ox, oy))
    return canvas


logo_alpha = alpha_mask_from_white_bg(logo_crop)  # نفس الألوان (أحمر) + شفافية
logo_white = recolor_white(logo_alpha)            # نفس الشكل بالظبط, أبيض, لل splash

os.makedirs(OUT, exist_ok=True)

# 1) icon.png — 1024×1024, مربع أبيض مسطّح (بدون استدارة زوايا مدمجة —
#    iOS/Android بيطبّقوا القناع بنفسهم وقت العرض).
icon = Image.new("RGB", (1024, 1024), (255, 255, 255))
paste_centered(icon, logo_crop, target_w=round(1024 * 0.74))
icon.save(os.path.join(OUT, "icon.png"))
print("wrote icon.png", icon.size)

# 2) android-icon-background.png — 512×512 أبيض مسطّح (نفس خلفية اللوجو)
bg = Image.new("RGBA", (512, 512), (255, 255, 255, 255))
bg.save(os.path.join(OUT, "android-icon-background.png"))
print("wrote android-icon-background.png", bg.size)

# 3) android-icon-foreground.png — 512×512, اللوجو (بلونه الأحمر الأصلي)
#    شفاف حوليه, متمركز جوه الـsafe zone (~66% من الكانفاس) عشان
#    مايتقصّش تحت أقنعة اللانشر الدائرية/المربعة.
fg = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
paste_centered(fg, logo_alpha, target_w=round(512 * 0.66))
fg.save(os.path.join(OUT, "android-icon-foreground.png"))
print("wrote android-icon-foreground.png", fg.size)

# 4) android-icon-monochrome.png — 432×432, نفس الشكل بس أبيض شفاف
#    (Android بيتجاهل اللون في الطبقة دي, بيستخدم الـalpha بس كـthemed icon)
mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
paste_centered(mono, logo_white, target_w=round(432 * 0.66))
mono.save(os.path.join(OUT, "android-icon-monochrome.png"))
print("wrote android-icon-monochrome.png", mono.size)

# 5) favicon.png — 48×48, نفس تكوين icon.png بس مصغّر
favicon = Image.new("RGB", (256, 256), (255, 255, 255))
paste_centered(favicon, logo_crop, target_w=round(256 * 0.74))
favicon = favicon.resize((48, 48), Image.LANCZOS).convert("RGBA")
favicon.save(os.path.join(OUT, "favicon.png"))
print("wrote favicon.png", favicon.size)

# 6) splash-logo.png — نفس شكل اللوجو بالظبط, أبيض شفاف, بنسبة العرض/
#    الارتفاع الطبيعية بتاعته (مش مربوطة بمقاس التطبيق التاسبق, ده كان
#    خاص بالقوس القديم). دقة عالية عشان BrandSplash يكبّرها براحته.
splash_w = 1536
splash_h = round(splash_w * (LOGO_H / LOGO_W))
splash = logo_white.resize((splash_w, splash_h), Image.LANCZOS)
splash.save(os.path.join(OUT, "splash-logo.png"))
print("wrote splash-logo.png", splash.size, "aspect:", splash_w / splash_h)
