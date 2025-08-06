import os
import streamlit as st
from streamlit_drawable_canvas import st_canvas
from PIL import Image
import yaml


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
    st.set_page_config(layout="wide")
    st.title("Annotatore di campi")

    # ---- Caricamento immagine di sfondo ----
    tpl_file = st.sidebar.file_uploader("Template (PNG/JPG)", type=["png", "jpg", "jpeg"])
    if tpl_file:
        bg_img = Image.open(tpl_file)
        tpl_name = tpl_file.name
    else:
        bg_img = Image.open(DEFAULT_TEMPLATE)
        tpl_name = os.path.basename(DEFAULT_TEMPLATE)
        st.sidebar.info(f"Usando template: {DEFAULT_TEMPLATE}")

    # ---- Gestione stato ----
    if "annotations" not in st.session_state:
        st.session_state.annotations = []  # list of dict
    if "selected_idx" not in st.session_state:
        st.session_state.selected_idx = None
    if "yaml_name" not in st.session_state:
        st.session_state.yaml_name = "annotazioni.yml"
    if "loaded_yaml" not in st.session_state:
        st.session_state.loaded_yaml = None

    # ---- Caricamento YAML esistente ----
    yaml_path = st.sidebar.text_input("YAML esistente (opzionale)", "")
    if yaml_path and os.path.exists(yaml_path) and st.session_state.loaded_yaml != yaml_path:
        st.session_state.annotations = load_annotations_from_yaml(yaml_path)
        st.session_state.yaml_name = os.path.basename(yaml_path)
        st.session_state.loaded_yaml = yaml_path

    # ---- Prepara disegno iniziale ----
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

    mode = st.sidebar.radio("Modalità", ["Disegna", "Modifica"], horizontal=True)
    canvas_mode = "rect" if mode == "Disegna" else "transform"

    canvas_result = st_canvas(
        fill_color="rgba(0,0,0,0)",
        stroke_width=2,
        stroke_color="#FF0000",
        background_image=bg_img,
        update_streamlit=True,
        height=bg_img.height,
        width=bg_img.width,
        drawing_mode=canvas_mode,
        initial_drawing=initial_drawing,
        display_toolbar=True,
        key="canvas",
    )

    # ---- Interpreta risultato canvas ----
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
        active = canvas_result.json_data.get("activeObject")
        if active and "id" in active:
            st.session_state.selected_idx = int(active["id"])

    # ---- Sidebar proprietà ----
    st.sidebar.markdown("## Proprietà")
    idx = st.session_state.selected_idx
    if idx is not None and idx < len(st.session_state.annotations):
        ann = st.session_state.annotations[idx]
        with st.sidebar.form("form_props"):
            field_name = st.text_input("field_name", ann["field_name"])
            font = st.text_input("font", ann["font"])
            font_size = st.number_input("font_size", value=ann["font_size"], step=1)
            font_color = st.text_input("font_color", ann["font_color"])
            field_type = st.selectbox(
                "field_type",
                ["testo", "immagine", "firma", "timbro", "foto_volto"],
                index=["testo", "immagine", "firma", "timbro", "foto_volto"].index(
                    ann["field_type"]
                ),
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
        if st.sidebar.button("Elimina rettangolo"):
            st.session_state.annotations.pop(idx)
            st.session_state.selected_idx = None
            st.experimental_rerun()
    else:
        st.sidebar.write("Disegna o seleziona un rettangolo.")

    # ---- Lista annotazioni ----
    st.subheader("Annotazioni")
    for i, ann in enumerate(st.session_state.annotations):
        st.write(
            f"{i}: {ann['field_name']} ({ann['field_type']}) -> x:{ann['left']} y:{ann['top']} w:{ann['width']} h:{ann['height']}"
        )

    # ---- Esporta YAML ----
    if st.button("Esporta YAML"):
        yaml_str = annotations_to_yaml(tpl_name, st.session_state.annotations)
        if st.session_state.loaded_yaml:
            save_annotations_to_yaml(
                st.session_state.loaded_yaml, tpl_name, st.session_state.annotations
            )
        st.download_button(
            "Scarica YAML", yaml_str, file_name=st.session_state.yaml_name
        )
        st.code(yaml_str, language="yaml")


if __name__ == "__main__":
    main()
