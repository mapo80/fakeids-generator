import streamlit as st
from streamlit_drawable_canvas import st_canvas
import yaml

st.title("Annotatore di campi ID (esporta YAML)")

# Carica immagine di base
img_file = st.file_uploader("Carica template (PNG/JPG)", type=["png","jpg","jpeg"])
if not img_file:
    st.stop()

from PIL import Image
bg = Image.open(img_file)

# Setup del canvas
canvas_result = st_canvas(
    fill_color="rgba(0,0,0,0)",
    stroke_width=2,
    stroke_color="#FF0000",
    background_image=bg,
    update_streamlit=True,
    height=bg.height,
    width=bg.width,
    drawing_mode="rect",
    key="canvas",
)

# Memo dei campi annotati
if "fields" not in st.session_state:
    st.session_state.fields = {}

st.sidebar.header("Definisci etichetta")
label = st.sidebar.text_input("Nome campo", value="campo1")
if st.sidebar.button("Registra rettangolo"):
    if canvas_result.json_data and canvas_result.json_data["objects"]:
        obj = canvas_result.json_data["objects"][-1]
        x, y = obj["left"], obj["top"]
        w, h = obj["width"], obj["height"]
        st.session_state.fields[label] = {
            "x": int(x), "y": int(y),
            "w": int(w), "h": int(h)
        }
        st.experimental_rerun()

# Mostra tabella dei campi definiti
st.subheader("Campi definiti")
for k,v in st.session_state.fields.items():
    st.write(f"- **{k}** → x:{v['x']} y:{v['y']} w:{v['w']} h:{v['h']}")

# Esporta YAML
if st.button("Esporta YAML"):
    tpl = {
        "template": img_file.name,
        "fields": st.session_state.fields
    }
    yaml_str = yaml.dump(tpl, sort_keys=False)
    st.code(yaml_str, language="yaml")
    st.download_button("Scarica YAML", yaml_str, file_name="template_coords.yml")
