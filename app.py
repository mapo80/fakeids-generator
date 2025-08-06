import os
import io
import base64
import streamlit as st
import streamlit.elements.image as st_image
from streamlit_drawable_canvas import st_canvas
from PIL import Image
import yaml


def _image_to_url(
    image,
    width,
    clamp=False,
    channels="RGB",
    output_format="PNG",
    image_id=None,
):
    """Return a data URL for a PIL image.

    Recent Streamlit versions removed ``image_to_url`` which the canvas depends on.
    This helper mirrors the original behaviour by ensuring the image uses the
    requested channels before encoding it as base64."""

    # ``convert`` avoids a blank/black canvas when the source image is not in
    # the expected mode (e.g. palette based or grayscale)
    img = image.convert(channels)
    buf = io.BytesIO()
    img.save(buf, format=output_format)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/{output_format.lower()};base64,{b64}"


if not hasattr(st_image, "image_to_url"):
    st_image.image_to_url = _image_to_url


def _rerun():
    """Compatibility wrapper for Streamlit rerun APIs."""
    if hasattr(st, "rerun"):
        st.rerun()
    else:  # pragma: no cover - older Streamlit
        st.experimental_rerun()


def load_annotations_from_yaml(path: str):
    """Load annotation data from a YAML file.

    Returns a list of annotation dictionaries.
    """
    annotations = []
    if path and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        for fname, props in (data.get("fields", {}) or {}).items():
            annotations.append(
                {
                    "field_name": fname,
                    "font": props.get("font", ""),
                    "font_size": int(props.get("font_size", 12)),
                    "font_color": props.get("font_color", "#000000"),
                    "field_type": props.get("field_type", "testo"),
                    "left": int(props.get("x_left", 0)),
                    "top": int(props.get("y_top", 0)),
                    "width": int(props.get("width", 0)),
                    "height": int(props.get("height", 0)),
                }
            )
    return annotations


def load_annotations_from_uploaded(uploaded_file):
    """Load annotations from an uploaded YAML file."""
    data = yaml.safe_load(uploaded_file.read().decode("utf-8")) or {}
    annotations = []
    for fname, props in (data.get("fields", {}) or {}).items():
        annotations.append(
            {
                "field_name": fname,
                "font": props.get("font", ""),
                "font_size": int(props.get("font_size", 12)),
                "font_color": props.get("font_color", "#000000"),
                "field_type": props.get("field_type", "testo"),
                "left": int(props.get("x_left", 0)),
                "top": int(props.get("y_top", 0)),
                "width": int(props.get("width", 0)),
                "height": int(props.get("height", 0)),
            }
        )
    return annotations


def annotations_to_yaml(template_name: str, annotations):
    """Convert annotations to a YAML string."""
    data = {"template": template_name, "fields": {}}
    for ann in annotations:
        data["fields"][ann["field_name"]] = {
            "x_left": ann["left"],
            "y_top": ann["top"],
            "width": ann["width"],
            "height": ann["height"],
            "font": ann["font"],
            "font_size": ann["font_size"],
            "font_color": ann["font_color"],
            "field_type": ann["field_type"],
        }
    return yaml.dump(data, sort_keys=False, allow_unicode=True)


def save_annotations_to_yaml(path: str, template_name: str, annotations):
    """Write annotations to a YAML file and return the YAML string."""
    yaml_str = annotations_to_yaml(template_name, annotations)
    with open(path, "w", encoding="utf-8") as f:
        f.write(yaml_str)
    return yaml_str


# Percorso template di default
DEFAULT_TEMPLATE = "dataset/CARTA_IDENTITA_CARTACEA/Template/fronte.jpeg"


def main():
    if "collapse_sidebar" not in st.session_state:
        st.session_state.collapse_sidebar = False
    st.set_page_config(
        layout="wide",
        initial_sidebar_state="collapsed"
        if st.session_state.collapse_sidebar
        else "expanded",
    )
    if st.session_state.collapse_sidebar:
        # reset so subsequent interactions don't repeatedly collapse it
        st.session_state.collapse_sidebar = False
    st.title("Annotatore di campi")

    if "bg_img" not in st.session_state:
        st.session_state.bg_img = Image.open(DEFAULT_TEMPLATE)
        st.session_state.tpl_name = os.path.basename(DEFAULT_TEMPLATE)
        st.session_state.annotations = []
        st.session_state.selected_idx = None
        st.session_state.yaml_name = "annotazioni.yml"
        st.session_state.yaml_path = "annotazioni.yml"

    with st.sidebar.form("loader"):
        tpl_file = st.file_uploader("Template (PNG/JPG)", type=["png", "jpg", "jpeg"])
        yaml_file = st.file_uploader("YAML esistente (opzionale)", type=["yml", "yaml"])
        load_clicked = st.form_submit_button("Carica")

    if load_clicked:
        if tpl_file:
            st.session_state.bg_img = Image.open(tpl_file)
            st.session_state.tpl_name = tpl_file.name
        else:
            st.session_state.bg_img = Image.open(DEFAULT_TEMPLATE)
            st.session_state.tpl_name = os.path.basename(DEFAULT_TEMPLATE)
        st.session_state.annotations = []
        if yaml_file:
            st.session_state.annotations = load_annotations_from_uploaded(yaml_file)
            st.session_state.yaml_name = yaml_file.name
            st.session_state.yaml_path = yaml_file.name
        else:
            st.session_state.yaml_name = "annotazioni.yml"
            st.session_state.yaml_path = "annotazioni.yml"
        st.session_state.selected_idx = None
        st.session_state.collapse_sidebar = True
        _rerun()

    if st.session_state.tpl_name == os.path.basename(DEFAULT_TEMPLATE):
        st.sidebar.info(f"Usando template: {DEFAULT_TEMPLATE}")

    bg_img = st.session_state.bg_img
    tpl_name = st.session_state.tpl_name

    objects = []
    for i, ann in enumerate(st.session_state.annotations):
        objects.append(
            {
                "type": "rect",
                "left": ann["left"],
                "top": ann["top"],
                "width": ann["width"],
                "height": ann["height"],
                "fill": "rgba(0,0,0,0)",
                "stroke": "#FF0000",
                "strokeWidth": 2,
                "id": str(i),
            }
        )
    initial_drawing = {"version": "4.4.0", "objects": objects}

    col_canvas, col_props = st.columns([4, 1])
    with col_canvas:
        canvas_result = st_canvas(
            fill_color="rgba(0,0,0,0)",
            stroke_width=2,
            stroke_color="#FF0000",
            background_image=bg_img,
            update_streamlit=True,
            height=bg_img.height,
            width=bg_img.width,
            drawing_mode="rect",
            initial_drawing=initial_drawing,
            display_toolbar=True,
            key="canvas",
        )

    if canvas_result.json_data:
        objs = canvas_result.json_data.get("objects", [])
        for obj in objs:
            if "id" in obj:
                idx = int(obj["id"])
                if idx < len(st.session_state.annotations):
                    st.session_state.annotations[idx].update(
                        {
                            "left": int(obj.get("left", 0)),
                            "top": int(obj.get("top", 0)),
                            "width": int(obj.get("width", 0)),
                            "height": int(obj.get("height", 0)),
                        }
                    )
            else:
                idx = len(st.session_state.annotations)
                st.session_state.annotations.append(
                    {
                        "field_name": f"field_{idx}",
                        "font": "",
                        "font_size": 12,
                        "font_color": "#000000",
                        "field_type": "testo",
                        "left": int(obj.get("left", 0)),
                        "top": int(obj.get("top", 0)),
                        "width": int(obj.get("width", 0)),
                        "height": int(obj.get("height", 0)),
                    }
                )
                # auto-select newly added rectangle so its properties appear in the panel
                st.session_state.selected_idx = idx
                _rerun()
        active = canvas_result.json_data.get("activeObject")
        if active and "id" in active:
            st.session_state.selected_idx = int(active["id"])

    with col_props:
        st.markdown("## Proprietà")
        idx = st.session_state.selected_idx
        if idx is not None and idx < len(st.session_state.annotations):
            ann = st.session_state.annotations[idx]
            with st.form("form_props"):
                field_name = st.text_input("field_name", ann["field_name"])
                font = st.text_input("font", ann["font"])
                font_size = st.number_input(
                    "font_size", value=ann["font_size"], step=1
                )
                font_color = st.text_input("font_color", ann["font_color"])
                field_type = st.selectbox(
                    "field_type",
                    ["testo", "immagine", "firma", "timbro", "foto_volto"],
                    index=[
                        "testo",
                        "immagine",
                        "firma",
                        "timbro",
                        "foto_volto",
                    ].index(ann["field_type"]),
                )
                submitted = st.form_submit_button("Aggiorna")
            if submitted:
                ann.update(
                    {
                        "field_name": field_name,
                        "font": font,
                        "font_size": int(font_size),
                        "font_color": font_color,
                        "field_type": field_type,
                    }
                )
            if st.button("Elimina rettangolo"):
                st.session_state.annotations.pop(idx)
                st.session_state.selected_idx = None
                _rerun()
        else:
            st.write("Disegna o seleziona un rettangolo tramite la toolbar.")

    st.subheader("Annotazioni")
    for i, ann in enumerate(st.session_state.annotations):
        st.write(
            f"{i}: {ann['field_name']} ({ann['field_type']}) -> x:{ann['left']} y:{ann['top']} w:{ann['width']} h:{ann['height']}"
        )

    if st.button("Esporta YAML"):
        yaml_str = annotations_to_yaml(tpl_name, st.session_state.annotations)
        save_annotations_to_yaml(
            st.session_state.yaml_path, tpl_name, st.session_state.annotations
        )
        st.download_button(
            "Scarica YAML", yaml_str, file_name=st.session_state.yaml_name
        )
        st.code(yaml_str, language="yaml")


if __name__ == "__main__":
    main()
