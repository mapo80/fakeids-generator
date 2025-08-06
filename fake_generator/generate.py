import argparse
import datetime
import os
import random
import subprocess
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import yaml
from PIL import Image, ImageDraw, ImageFont
from faker import Faker

fake = Faker('it_IT')


def load_font(font_name: str | None, font_size: int) -> ImageFont.FreeTypeFont:
    """Try to load a font by name; fall back to a default font."""
    fonts_dir = Path(__file__).resolve().parent.parent / "fonts"
    font_map = {
        "ocr-b": fonts_dir / "ocrb" / "OCRB Regular.ttf",
    }
    if font_name:
        key = font_name.lower()
        if key in font_map:
            try:
                return ImageFont.truetype(str(font_map[key]), font_size)
            except Exception:
                pass
        try:
            return ImageFont.truetype(font_name, font_size)
        except Exception:
            pass
    try:
        return ImageFont.truetype("DejaVuSans.ttf", font_size)
    except Exception:
        return ImageFont.load_default()


def generate_text(field: dict) -> str:
    ttype = field.get("text_type", "generico")
    if ttype == "data":
        dt = fake.date_between(datetime.date(1990, 1, 1), datetime.date(2030, 12, 31))
        return dt.strftime("%d/%m/%Y")
    if ttype == "citta":
        return fake.city().upper()
    if ttype == "nominativo":
        return f"{fake.first_name()} {fake.last_name()}".upper()
    if ttype == "generico":
        return fake.bothify(text="??????###").upper()
    return fake.word().upper()


def draw_text(draw: ImageDraw.ImageDraw, field: dict, text: str) -> None:
    x = field["x_left"]
    y = field["y_top"]
    w = field["width"]
    h = field["height"]
    font_name = field.get("font")
    font_size = field.get("font_size", 12)
    font_color = field.get("font_color", "#000000")
    align = field.get("text_align", "left")

    # shrink font until text fits inside the bounding box
    while True:
        font = load_font(font_name, font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if (text_w <= w and text_h <= h) or font_size <= 1:
            break
        font_size -= 1

    if align == "center":
        tx = x + (w - text_w) / 2
    elif align == "right":
        tx = x + w - text_w
    else:  # left
        tx = x
    ty = y + (h - text_h) / 2
    draw.text((tx, ty), text, fill=font_color, font=font)


def paste_image(img: Image.Image, field: dict, src_path: Path) -> None:
    """Paste an image into the given field, resizing to fit."""
    x = int(field["x_left"])
    y = int(field["y_top"])
    w = int(field["width"])
    h = int(field["height"])
    patch = Image.open(src_path).convert("RGBA")
    pw, ph = patch.size
    scale = min(w / pw, h / ph)
    new_w = int(pw * scale)
    new_h = int(ph * scale)
    patch = patch.resize((new_w, new_h), Image.LANCZOS)
    px = x + (w - new_w) // 2
    py = y + (h - new_h) // 2
    img.paste(patch, (px, py), patch)


def prepare_signatures(username: str, key: str, sig_dir: Path) -> list[Path]:
    """Ensure the signature dataset exists locally and return image paths."""
    sig_dir.mkdir(parents=True, exist_ok=True)
    images = list(sig_dir.rglob("*.png")) + list(sig_dir.rglob("*.jpg"))
    if images:
        return images

    os.environ["KAGGLE_USERNAME"] = username
    os.environ["KAGGLE_KEY"] = key
    subprocess.run(
        [
            "kaggle",
            "datasets",
            "download",
            "-d",
            "aminizahra/signature",
            "-p",
            str(sig_dir),
            "--unzip",
        ],
        check=True,
    )
    images = list(sig_dir.rglob("*.png")) + list(sig_dir.rglob("*.jpg"))
    return images


def prepare_stamps(download_url: str, stamp_dir: Path) -> list[Path]:
    """Download the stamp dataset and return cropped stamp images."""
    stamp_dir.mkdir(parents=True, exist_ok=True)
    crop_dir = stamp_dir / "cropped"
    crops = list(crop_dir.rglob("*.png")) + list(crop_dir.rglob("*.jpg"))
    if crops:
        return crops

    # Ensure dataset is downloaded and extracted
    if not list(stamp_dir.rglob("labels/*.txt")):
        zip_path = stamp_dir / "dataset.zip"
        if not zip_path.exists():
            urlretrieve(download_url, zip_path)
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(stamp_dir)

    crop_dir.mkdir(parents=True, exist_ok=True)
    crops = []
    for label_file in stamp_dir.rglob("labels/*.txt"):
        image_path = label_file.parent.parent / "images" / (
            label_file.stem + ".jpg"
        )
        if not image_path.exists():
            image_path = image_path.with_suffix(".png")
        if not image_path.exists():
            continue
        with open(label_file, "r", encoding="utf-8") as lf:
            lines = lf.readlines()
        img = Image.open(image_path)
        img_w, img_h = img.size
        for i, line in enumerate(lines):
            parts = line.strip().split()
            if len(parts) != 5:
                continue
            _, xc, yc, bw, bh = map(float, parts)
            x1 = max(int((xc - bw / 2) * img_w), 0)
            y1 = max(int((yc - bh / 2) * img_h), 0)
            x2 = min(int((xc + bw / 2) * img_w), img_w)
            y2 = min(int((yc + bh / 2) * img_h), img_h)
            crop = img.crop((x1, y1, x2, y2))
            out_path = crop_dir / f"{image_path.stem}_{i}.png"
            crop.save(out_path)
            crops.append(out_path)
    return crops


def generate_image(
    template_path: Path,
    fields: dict,
    out_path: Path,
    signatures: list[Path],
    stamps: list[Path],
) -> None:
    img = Image.open(template_path).convert("RGB")
    draw = ImageDraw.Draw(img)
    for field_name, field in fields.items():
        ftype = field.get("field_type")
        if ftype == "testo":
            text = generate_text(field)
            draw_text(draw, field, text)
        elif ftype == "firma" and signatures:
            sig_path = random.choice(signatures)
            paste_image(img, field, sig_path)
        elif ftype == "timbro" and stamps:
            stamp_path = random.choice(stamps)
            paste_image(img, field, stamp_path)
    img.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate fake documents from a YAML template"
    )
    parser.add_argument("template", help="Path to the YAML template")
    parser.add_argument(
        "--count", type=int, default=1, help="Number of images to generate"
    )
    parser.add_argument(
        "--output", default="output", help="Directory where images will be saved"
    )
    parser.add_argument("--kaggle-username", required=True, help="Kaggle username")
    parser.add_argument("--kaggle-key", required=True, help="Kaggle API key")
    parser.add_argument(
        "--signature-dir",
        default="signatures",
        help="Directory where signature images will be stored",
    )
    parser.add_argument(
        "--stamp-url",
        default="https://universe.roboflow.com/ds/nFOAsLSd0B?key=3KhWB5eKSS",
        help="Roboflow download URL for stamps dataset",
    )
    parser.add_argument(
        "--stamp-dir",
        default="stamps",
        help="Directory where stamp images will be stored",
    )
    args = parser.parse_args()

    yaml_path = Path(args.template)
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    template_img = yaml_path.parent / data["template"]
    fields = data.get("fields", {})
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    sig_dir = Path(args.signature_dir)
    signatures = prepare_signatures(args.kaggle_username, args.kaggle_key, sig_dir)
    stamp_dir = Path(args.stamp_dir)
    stamps = prepare_stamps(args.stamp_url, stamp_dir)

    for i in range(args.count):
        out_file = out_dir / f"generated_{i+1}.png"
        generate_image(template_img, fields, out_file, signatures, stamps)


if __name__ == "__main__":
    main()
