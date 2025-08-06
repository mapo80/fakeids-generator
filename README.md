# Fake IDs Generator

This project provides a web tool for visually annotating identity document templates. The resulting YAML files describe the
position and styling of fields and can be used to generate synthetic documents.

## Installation

Install the Node.js dependencies:

```bash
npm install
```

## Usage

Start the development server:

```bash
npm run dev
```

1. In the first page, select a template image and optionally a YAML file with existing annotations.
2. Click **Carica** to open the editor.
3. Draw rectangles on the image by dragging with the mouse.
4. Select rectangles to edit their properties in the panel on the right or delete them.
5. Use **Salva YAML** to download the updated annotations.

## Tests

An end-to-end test verifies the YAML import/export roundtrip. Run:

```bash
npm test
```
