# Fake IDs Generator

This project contains utilities for creating annotated templates of identification documents. The annotations are later used to
generate synthetic identity cards or other documents.

## Installation

Install the dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Run the interactive annotation tool:

```bash
streamlit run app.py
```

From the sidebar form:
- Select a template image or use the default one.
- Optionally choose an existing YAML file to preload annotations.
- Press **Carica** to load the files.
  The sidebar collapses after loading; use the arrow on the left to expand it again.

Draw rectangles on the canvas and use the toolbar to switch between drawing and selection. Edit properties from the sidebar and
export the YAML definition with **Esporta YAML**, which also saves a copy on disk.

## Tests

End-to-end tests verify that the Streamlit server starts and that YAML
annotations can be loaded and exported correctly. Run:

```bash
pytest
```
