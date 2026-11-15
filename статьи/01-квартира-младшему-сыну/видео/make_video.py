"""Вертикальный видео-тизер (1080x1920) к статье. Запуск: python3 make_video.py

Нужны: Pillow, ffmpeg. Результат: тизер.mp4 рядом со скриптом.
"""
import os
import random
import shutil
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
FPS = 30
SLIDE_SEC = 5.0
FADE_SEC = 1.0
HERE = os.path.dirname(os.path.abspath(__file__))
SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
SERIF_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# (верхняя подпись, основной текст, нижняя подпись, цвет фона)
SLIDES = [
    ("Юбилей свекрови. 72 года.", "Холодец, «Наполеон»\nдо двух ночи\nи две соседки", "", (58, 34, 28)),
    ("Тост младшего сына", "«Раз уж квартира\nтеперь моя —\nзаймусь весной»", "", (40, 30, 48)),
    ("", "За столом\nстало тихо.", "", (20, 20, 24)),
    ("Марина — мужу", "— Ты знал?\n\n— Марин, давай\nне сейчас.", "", (34, 40, 52)),
    ("Двадцать один год", "«Мариночка,\nты же понимаешь»", "ремонт на деньги «на дачу»\nвторники в поликлинике", (60, 44, 30)),
    ("", "Квартиру — младшему.\n\nВрачей — невестке?", "", (70, 26, 30)),
    ("Утром позвонила свекровь", "— Во вторник\nне смогу.\nПопросите Костю.", "", (30, 46, 44)),
    ("А через три недели", "позвонила\nсоседка…", "", (24, 24, 34)),
    ("Семейная драма · читать полностью", "Свекровь подарила\nквартиру\nмладшему сыну", "А к врачам возить — невестке", (52, 30, 26)),
]


def background(color, seed):
    """Тёплый градиент + виньетка + лёгкое зерно."""
    rnd = random.Random(seed)
    img = Image.new("RGB", (W, H), color)
    px = img.load()
    r0, g0, b0 = color
    for y in range(H):
        k = 0.75 + 0.5 * (1 - y / H)  # светлее сверху
        row = (min(255, int(r0 * k)), min(255, int(g0 * k)), min(255, int(b0 * k)))
        for x in range(0, W):
            px[x, y] = row
    # мягкое «окно света»
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy = rnd.randint(250, 830), rnd.randint(450, 900)
    gd.ellipse((cx - 520, cy - 520, cx + 520, cy + 520), fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    img = Image.composite(Image.new("RGB", (W, H), (255, 214, 170)), img, glow)
    # виньетка
    vig = Image.new("L", (W, H), 0)
    ImageDraw.Draw(vig).ellipse((-300, -200, W + 300, H + 200), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(260))
    img = Image.composite(img, Image.new("RGB", (W, H), (0, 0, 0)), vig)
    # зерно
    noise = Image.effect_noise((W, H), 18).convert("RGB")
    return Image.blend(img, noise, 0.05)


def centered(draw, text, font, y, fill, spacing):
    box = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing, align="center")
    w, h = box[2] - box[0], box[3] - box[1]
    draw.multiline_text(((W - w) / 2, y), text, font=font, fill=fill, spacing=spacing, align="center")
    return h


def fit_font(draw, text, path, start, max_w):
    size = start
    while size > 30:
        f = ImageFont.truetype(path, size)
        box = draw.multiline_textbbox((0, 0), text, font=f, spacing=int(size * 0.35), align="center")
        if box[2] - box[0] <= max_w:
            return f
        size -= 4
    return ImageFont.truetype(path, size)


def render_slide(i, top, main, bottom, color, path):
    img = background(color, i)
    d = ImageDraw.Draw(img)
    f_main = fit_font(d, main, SERIF_BOLD, 104, W - 160)
    spacing = int(f_main.size * 0.35)
    box = d.multiline_textbbox((0, 0), main, font=f_main, spacing=spacing, align="center")
    main_h = box[3] - box[1]
    y = (H - main_h) / 2 - 40
    if top:
        f_top = ImageFont.truetype(SANS, 44)
        centered(d, top.upper(), f_top, y - 150, (236, 200, 160), 10)
        d.line(((W / 2 - 60, y - 70), (W / 2 + 60, y - 70)), fill=(236, 200, 160), width=3)
    # тень + текст
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    centered(ImageDraw.Draw(shadow), main, f_main, y + 6, (0, 0, 0, 170), spacing)
    img.paste(shadow.filter(ImageFilter.GaussianBlur(8)), (0, 0), shadow.filter(ImageFilter.GaussianBlur(8)))
    d = ImageDraw.Draw(img)
    centered(d, main, f_main, y, (250, 244, 236), spacing)
    if bottom:
        f_b = fit_font(d, bottom, SERIF, 46, W - 160)
        centered(d, bottom, f_b, y + main_h + 110, (230, 210, 190), 12)
    # плашка канала
    f_s = ImageFont.truetype(SANS, 34)
    centered(d, "Семейные драмы · история целиком — в статье", f_s, H - 170, (200, 180, 160), 8)
    img.save(path)


def main():
    tmp = tempfile.mkdtemp()
    try:
        clips = []
        frames = int(SLIDE_SEC * FPS)
        for i, (top, text, bottom, color) in enumerate(SLIDES):
            png = os.path.join(tmp, f"s{i}.png")
            render_slide(i, top, text, bottom, color, png)
            clip = os.path.join(tmp, f"c{i}.mp4")
            # медленный «наезд» камеры (Ken Burns)
            zoom = f"zoompan=z='1+0.06*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png,
                            "-vf", f"scale={W*2}:{H*2},{zoom},format=yuv420p",
                            "-t", str(SLIDE_SEC), "-c:v", "libx264", "-preset", "medium", "-crf", "20", clip],
                           check=True)
            clips.append(clip)

        # склейка с плавными переходами
        inputs, filt, last, offset = [], [], "[0:v]", 0.0
        for c in clips:
            inputs += ["-i", c]
        for i in range(1, len(clips)):
            offset += SLIDE_SEC - FADE_SEC
            out = f"[v{i}]"
            filt.append(f"{last}[{i}:v]xfade=transition=fade:duration={FADE_SEC}:offset={offset:.2f}{out}")
            last = out
        total = SLIDE_SEC * len(clips) - FADE_SEC * (len(clips) - 1)

        # тихий «эмбиент»: аккорд ля-минор с медленной пульсацией
        notes = [110.0, 164.81, 220.0, 261.63, 329.63]
        expr = "+".join(f"0.05*sin(2*PI*{f}*t)*(0.6+0.4*sin(2*PI*0.{i+1}*t))" for i, f in enumerate(notes))
        audio = (f"aevalsrc='{expr}':s=44100:d={total},"
                 f"lowpass=f=1200,aecho=0.8:0.7:600:0.35,afade=t=in:d=2,afade=t=out:st={total-3}:d=3,volume=1.4")
        out = os.path.join(HERE, "тизер.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs,
                        "-f", "lavfi", "-i", audio,
                        "-filter_complex", ";".join(filt) + f";{last}format=yuv420p[vout]",
                        "-map", "[vout]", "-map", f"{len(clips)}:a",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-movflags", "+faststart",
                        "-c:a", "aac", "-b:a", "128k", "-shortest", out], check=True)
        # обложка для ролика = последний слайд
        shutil.copy(os.path.join(tmp, f"s{len(SLIDES)-1}.png"), os.path.join(HERE, "обложка-ролика.png"))
        print(f"Готово: {out} ({total:.0f} сек)")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
