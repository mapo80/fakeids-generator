# Fake IDs Generator

This project contains utilities for creating annotated templates of identification documents. The annotations are later used to generate synthetic identity cards or other documents.

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

- Upload a template image or use the default one.
- Optionally load an existing YAML file to pre-populate annotations.
- Draw rectangles, edit their properties from the sidebar and export the YAML definition with **Esporta YAML**.

## Tests

End-to-end tests verify that the Streamlit server starts and that YAML
annotations can be loaded and exported correctly. Run:

```bash
pytest
```
