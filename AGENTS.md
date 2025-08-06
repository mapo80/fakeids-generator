# AGENTS

## Running the application

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Launch the annotation tool:
   ```bash
   streamlit run app.py
   ```
3. In the sidebar, use the **Carica** form to select a template image and an optional YAML file.
4. Draw or edit rectangles and export the annotations as YAML.

## Testing
- Execute `pytest` to run the end-to-end test which verifies that the Streamlit app starts correctly.
