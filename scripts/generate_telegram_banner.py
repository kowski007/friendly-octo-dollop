from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


WIDTH = 1600
HEIGHT = 900
OUTPUT = Path("public/telegram/nairatag-bot-banner.png")


def font_candidates(*names: str) -> Iterable[Path]:
    fonts_dir = Path("C:/Windows/Fonts")
    for name in names:
        yield fonts_dir / name


def load_font(size: int, *names: str) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in font_candidates(*names):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


def rounded_box(draw: ImageDraw.ImageDraw, box, radius: int, fill, outline=None, width: int = 1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def add_glow(base: Image.Image, center: tuple[int, int], radius: int, color: str, alpha: int):
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    x, y = center
    for scale, scale_alpha in ((1.0, alpha), (1.4, int(alpha * 0.45)), (1.9, int(alpha * 0.22))):
        r = int(radius * scale)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=(*ImageColor.getrgb(color), scale_alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius // 3))
    base.alpha_composite(overlay)


def draw_chip(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: tuple[int, int, int, int],
              outline: tuple[int, int, int, int], text_color: str, font: ImageFont.ImageFont):
    x, y = xy
    bbox = draw.textbbox((x, y), text, font=font)
    padding_x = 20
    padding_y = 12
    box = (
        x - padding_x,
        y - padding_y,
        bbox[2] + padding_x,
        bbox[3] + padding_y,
    )
    rounded_box(draw, box, radius=24, fill=fill, outline=outline, width=2)
    draw.text((x, y), text, font=font, fill=text_color)
    return box


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), "#07131C")
    bg = Image.new("RGBA", (WIDTH, HEIGHT), "#07131C")
    pixels = bg.load()

    top_left = ImageColor.getrgb("#0C2230")
    top_right = ImageColor.getrgb("#103A4E")
    bottom_left = ImageColor.getrgb("#0A181E")
    bottom_right = ImageColor.getrgb("#073B2A")

    for y in range(HEIGHT):
        ry = y / max(1, HEIGHT - 1)
        for x in range(WIDTH):
            rx = x / max(1, WIDTH - 1)
            top = tuple(int(top_left[i] * (1 - rx) + top_right[i] * rx) for i in range(3))
            bottom = tuple(int(bottom_left[i] * (1 - rx) + bottom_right[i] * rx) for i in range(3))
            color = tuple(int(top[i] * (1 - ry) + bottom[i] * ry) for i in range(3))
            pixels[x, y] = (*color, 255)

    canvas.alpha_composite(bg)
    add_glow(canvas, (240, 180), 190, "#18D7A6", 130)
    add_glow(canvas, (1220, 250), 240, "#42B5FF", 120)
    add_glow(canvas, (1210, 720), 280, "#0BC77E", 95)

    draw = ImageDraw.Draw(canvas)
    title_font = load_font(64, "segoeuib.ttf", "arialbd.ttf")
    subtitle_font = load_font(28, "segoeui.ttf", "arial.ttf")
    body_font = load_font(24, "segoeui.ttf", "arial.ttf")
    chip_font = load_font(24, "segoeuib.ttf", "arialbd.ttf")
    micro_font = load_font(18, "segoeui.ttf", "arial.ttf")
    card_title_font = load_font(34, "segoeuib.ttf", "arialbd.ttf")

    draw_chip(
        draw,
        (116, 98),
        "Telegram bot",
        fill=(16, 33, 44, 210),
        outline=(77, 201, 171, 160),
        text_color="#DDFCF3",
        font=chip_font,
    )

    draw.text((118, 176), "NairaTag lives in Telegram.", font=title_font, fill="#F4FBFF")
    draw.text(
        (118, 286),
        "Claim handles, receive payments, send money,\nand watch the marketplace live without leaving the chat.",
        font=subtitle_font,
        fill="#B7D4E0",
        spacing=10,
    )

    chip_specs = [
        ("Claim handles", "#102B33", "#1BC486"),
        ("Send money", "#102838", "#42B5FF"),
        ("Receive links", "#122B2A", "#24D39A"),
        ("Marketplace live", "#14233B", "#58A6FF"),
    ]

    chip_positions = [(118, 438), (402, 438), (118, 522), (402, 522)]
    for (label, fill_color, outline_color), position in zip(chip_specs, chip_positions):
        draw_chip(
            draw,
            position,
            label,
            fill=(*ImageColor.getrgb(fill_color), 215),
            outline=(*ImageColor.getrgb(outline_color), 180),
            text_color="#F7FCFF",
            font=chip_font,
        )

    draw.text(
        (118, 644),
        "The bot now mirrors the real NairaTag product flow: lookup, claim,\nmarketplace alerts, and payment entry points in one clean menu.",
        font=body_font,
        fill="#C4DCE6",
        spacing=8,
    )

    shell_box = (1020, 116, 1452, 790)
    rounded_box(draw, shell_box, radius=46, fill=(247, 251, 254, 232), outline=(255, 255, 255, 70), width=2)
    rounded_box(draw, (1052, 148, 1420, 758), radius=34, fill=(12, 26, 34, 245))

    draw.text((1084, 186), "@MyNairatagbot", font=card_title_font, fill="#F7FCFF")
    draw.text((1084, 234), "Claim your handle. Move money by identity.", font=body_font, fill="#A7CFDB")

    rounded_box(draw, (1084, 294, 1386, 370), radius=28, fill=(17, 43, 55, 255), outline=(71, 197, 165, 200), width=2)
    draw.text((1112, 317), "Claim handle", font=chip_font, fill="#F8FEFF")

    rounded_box(draw, (1084, 392, 1238, 458), radius=26, fill=(20, 49, 64, 255), outline=(77, 180, 255, 180), width=2)
    draw.text((1110, 412), "Send", font=body_font, fill="#F8FEFF")
    rounded_box(draw, (1254, 392, 1410, 458), radius=26, fill=(19, 54, 48, 255), outline=(43, 203, 139, 180), width=2)
    draw.text((1278, 412), "Receive", font=body_font, fill="#F8FEFF")

    rounded_box(draw, (1084, 492, 1410, 588), radius=30, fill=(244, 248, 251, 255))
    draw.text((1110, 520), "New sale: vendor closed at NGN 75,000", font=body_font, fill="#0C1822")
    draw.text((1110, 554), "Posted to the public Telegram channel instantly.", font=micro_font, fill="#526876")

    rounded_box(draw, (1084, 620, 1410, 714), radius=30, fill=(16, 38, 34, 255), outline=(35, 192, 126, 180), width=2)
    draw.text((1110, 650), "Verified social + payments + marketplace", font=body_font, fill="#F5FEFB")
    draw.text((1110, 684), "One chat surface. One identity layer.", font=micro_font, fill="#B8E9D3")

    draw_chip(
        draw,
        (1088, 744),
        "Live bot-ready banner asset",
        fill=(255, 255, 255, 235),
        outline=(208, 230, 242, 180),
        text_color="#123444",
        font=micro_font,
    )

    canvas.save(OUTPUT, format="PNG")
    print(f"saved {OUTPUT}")


if __name__ == "__main__":
    main()
