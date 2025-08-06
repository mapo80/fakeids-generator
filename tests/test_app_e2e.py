import os
import subprocess
import time
import urllib.request
import random
import yaml
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import app


def wait_for_health(url, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url) as r:
                if r.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def test_app_starts():
    env = os.environ.copy()
    proc = subprocess.Popen(
        ["streamlit", "run", "app.py", "--server.headless=true", "--server.port=8503", "--browser.gatherUsageStats=false"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    try:
        assert wait_for_health("http://localhost:8503/_stcore/health"), "Streamlit server did not start"
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def test_yaml_roundtrip(tmp_path):
    template_src = Path("dataset/CARTA_IDENTITA_CARTACEA/Template/fronte.jpeg")
    template_dest = tmp_path / "fronte.jpeg"
    template_dest.write_bytes(template_src.read_bytes())

    yaml_path = tmp_path / "anno.yml"
    existing = {
        "template": template_dest.name,
        "fields": {
            "preloaded": {
                "x_left": 1,
                "y_top": 2,
                "width": 3,
                "height": 4,
                "font": "",
                "font_size": 12,
                "font_color": "#000000",
                "field_type": "testo",
            }
        },
    }
    yaml_path.write_text(
        yaml.dump(existing, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )

    annotations = app.load_annotations_from_yaml(str(yaml_path))
    assert annotations and annotations[0]["field_name"] == "preloaded"

    left = random.randint(5, 50)
    top = random.randint(5, 50)
    width = random.randint(10, 60)
    height = random.randint(10, 60)
    annotations.append(
        {
            "field_name": "random_field",
            "font": "",
            "font_size": 12,
            "font_color": "#000000",
            "field_type": "testo",
            "left": left,
            "top": top,
            "width": width,
            "height": height,
        }
    )

    app.save_annotations_to_yaml(str(yaml_path), template_dest.name, annotations)

    data = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    assert data["template"] == template_dest.name
    assert set(data["fields"].keys()) == {"preloaded", "random_field"}
    rf = data["fields"]["random_field"]
    assert rf["x_left"] == left
    assert rf["y_top"] == top
    assert rf["width"] == width
    assert rf["height"] == height
