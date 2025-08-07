import React, { useEffect, useRef, useState } from 'react';
import { Annotation } from '../types';
import { exportYaml } from '../utils/yaml';

interface Props {
  image: string;
  imageName: string;
  annotations: Annotation[];
  setAnnotations: (a: Annotation[]) => void;
}

const fieldTypes = ['testo','immagine','firma','timbro','foto_volto'];
const fonts = ['OCR-B'];
const alignments = ['left', 'center', 'right'];
const textTypeOptions = [
  { value: 'numero', label: 'Numero' },
  { value: 'nome', label: 'Nome' },
  { value: 'cognome', label: 'Cognome' },
  { value: 'nominativo', label: 'Nominativo (Nome e cognome)' },
  { value: 'indirizzo', label: 'Indirizzo' },
  { value: 'citta', label: 'Città' },
  { value: 'data', label: 'Data dd-MM-yyyy' }
];

const AnnotatorPage: React.FC<Props> = ({ image, imageName, annotations, setAnnotations }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'none'|'drawing'|'moving'|'resizing'|'panning'>('none');
  const [start, setStart] = useState({ x:0, y:0 });
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [initialRect, setInitialRect] = useState({ left:0, top:0, width:0, height:0 });
  const [corner, setCorner] = useState<'nw'|'ne'|'sw'|'se'|null>(null);
  const longPressTimer = useRef<number | null>(null);
  const pressPos = useRef<{x:number,y:number}>({x:0,y:0});
  const [zoom, setZoom] = useState(1);
  const [baseZoom, setBaseZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [panStart, setPanStart] = useState<{x:number,y:number,scrollLeft:number,scrollTop:number}|null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const zoomIn = () => setZoom(z => z + 0.1);
  const zoomOut = () => setZoom(z => Math.max(0.1, z - 0.1));
  const resetZoom = () => setZoom(baseZoom);

  const cancelDrawing = () => {
    setAnnotations(annotations.filter(a => a.id !== selectedId));
    setSelectedId(null);
    setMode('none');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'drawing') {
        cancelDrawing();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, annotations, selectedId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (mode !== 'none') return;
    if (e.target !== wrapperRef.current && (e.target as HTMLElement).tagName !== 'IMG') return;

    const rect = wrapperRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left + wrapperRef.current!.scrollLeft) / zoom;
    const y = (e.clientY - rect.top + wrapperRef.current!.scrollTop) / zoom;
    pressPos.current = { x, y };
    const clientX = e.clientX;
    const clientY = e.clientY;
    longPressTimer.current = window.setTimeout(() => {
      setPanStart({
        x: clientX,
        y: clientY,
        scrollLeft: wrapperRef.current!.scrollLeft,
        scrollTop: wrapperRef.current!.scrollTop
      });
      setMode('panning');
      longPressTimer.current = null;
    }, 300);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === 'panning' && panStart) {
      wrapperRef.current!.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
      wrapperRef.current!.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
      return;
    }
    if (mode === 'none' && longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      const rect = wrapperRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left + wrapperRef.current!.scrollLeft) / zoom;
      const y = (e.clientY - rect.top + wrapperRef.current!.scrollTop) / zoom;
      const sx = pressPos.current.x;
      const sy = pressPos.current.y;
      const id = crypto.randomUUID();
      const newAnn: Annotation = {
        id,
        field_name: '',
        field_type: 'testo',
        font: fonts[0],
        font_size: 12,
        font_color: '#000000',
        text_type: textTypeOptions[0].value,
        text_align: 'left',
        left: Math.min(sx, x),
        top: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy)
      };
      setAnnotations([...annotations, newAnn]);
      setSelectedId(id);
      setStart({ x: sx, y: sy });
      setMode('drawing');
      return;
    }
    if (!selectedId || mode === 'none') return;
    const rect = wrapperRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left + wrapperRef.current!.scrollLeft) / zoom;
    const y = (e.clientY - rect.top + wrapperRef.current!.scrollTop) / zoom;
    setAnnotations(annotations.map(a => {
      if (a.id !== selectedId) return a;
      if (mode === 'drawing') {
        return {
          ...a,
          left: Math.min(start.x, x),
          top: Math.min(start.y, y),
          width: Math.abs(x - start.x),
          height: Math.abs(y - start.y)
        };
      }
      if (mode === 'moving') {
        return {
          ...a,
          left: x - offset.x,
          top: y - offset.y
        };
      }
      if (mode === 'resizing' && corner) {
        const ir = initialRect;
        let left = ir.left;
        let top = ir.top;
        let width = ir.width;
        let height = ir.height;
        const right = ir.left + ir.width;
        const bottom = ir.top + ir.height;
        switch (corner) {
          case 'nw':
            left = Math.min(x, right);
            top = Math.min(y, bottom);
            width = Math.abs(right - left);
            height = Math.abs(bottom - top);
            break;
          case 'ne':
            top = Math.min(y, bottom);
            width = Math.abs(x - ir.left);
            height = Math.abs(bottom - top);
            left = ir.left;
            break;
          case 'sw':
            left = Math.min(x, right);
            height = Math.abs(y - ir.top);
            width = Math.abs(right - left);
            top = ir.top;
            break;
          case 'se':
            width = Math.abs(x - ir.left);
            height = Math.abs(y - ir.top);
            left = ir.left;
            top = ir.top;
            break;
        }
        return { ...a, left, top, width, height };
      }
      return a;
    }));
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (mode === 'drawing') {
      if (e.button === 2) {
        cancelDrawing();
      } else if (e.button === 0) {
        const rect = wrapperRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left + wrapperRef.current!.scrollLeft) / zoom;
        const y = (e.clientY - rect.top + wrapperRef.current!.scrollTop) / zoom;
        const width = Math.abs(x - start.x);
        const height = Math.abs(y - start.y);
        if (width < 1 || height < 1) {
          cancelDrawing();
        } else {
          setAnnotations(annotations.map(a => {
            if (a.id !== selectedId) return a;
            return {
              ...a,
              left: Math.min(start.x, x),
              top: Math.min(start.y, y),
              width,
              height
            };
          }));
        }
      }
      setMode('none');
      return;
    }
    if (mode === 'moving' || mode === 'resizing' || mode === 'panning') {
      setMode('none');
      setCorner(null);
      setPanStart(null);
    }
  };

  const selected = annotations.find(a => a.id === selectedId);

  const updateSelected = (patch: Partial<Annotation>) => {
    if (!selected) return;
    setAnnotations(annotations.map(a => a.id === selected.id ? { ...a, ...patch } : a));
  };

  const deleteSelected = () => {
    if (!selected) return;
    setAnnotations(annotations.filter(a => a.id !== selected.id));
    setSelectedId(null);
  };

  const handleExport = () => {
    const yamlText = exportYaml(imageName, annotations);
    const blob = new Blob([yamlText], { type: 'text/yaml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = imageName.replace(/\.[^.]+$/, '') + '.yaml';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="d-flex" style={{ height: '100vh' }}>
      <div className="flex-grow-1 position-relative h-100" style={{ minWidth: 0 }}>
        <div
          className="position-relative overflow-auto w-100 h-100 image-wrapper"
          ref={wrapperRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={e => e.preventDefault()}
          style={{ cursor: mode === 'panning' ? 'grabbing' : 'crosshair' }}
        >
          <img
            ref={imgRef}
            src={image}
            alt="template"
            draggable={false}
            onMouseDown={e => e.preventDefault()}
            onDragStart={e => e.preventDefault()}
            style={{
              width: imgSize.width ? imgSize.width * zoom : undefined,
              height: imgSize.height ? imgSize.height * zoom : undefined
            }}
            onLoad={e => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              setImgSize({ width: naturalWidth, height: naturalHeight });
              if (wrapperRef.current) {
                const fit = Math.min(
                  wrapperRef.current.clientWidth / naturalWidth,
                  wrapperRef.current.clientHeight / naturalHeight
                );
                setBaseZoom(fit);
                setZoom(fit);
              }
            }}
          />
            {annotations.map((a, idx) => (
              <div
                key={a.id}
                data-testid="bbox"
                className={`position-absolute border ${a.id === selectedId ? 'border-primary' : 'border-danger'}`}
                style={{
                  left: a.left * zoom,
                  top: a.top * zoom,
                  width: a.width * zoom,
                  height: a.height * zoom,
                  cursor: selectedId === a.id && mode === 'moving' ? 'grabbing' : 'grab',
                  zIndex: idx
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  setSelectedId(a.id);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setOffset({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                  setMode('moving');
                }}
              >
              <div
                className={`position-absolute text-white px-1 ${a.id === selectedId ? 'bg-primary' : 'bg-danger'}`}
                style={{ top: 0, left: 0, fontSize: '0.7rem', pointerEvents: 'none' }}
              >
                {a.field_name}
              </div>
              {a.id === selectedId && (
                <>
                  <div
                    className="bg-white border border-primary position-absolute"
                    style={{ width: 8, height: 8, left: -4, top: -4, cursor: 'nw-resize' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setCorner('nw');
                      setInitialRect({ left: a.left, top: a.top, width: a.width, height: a.height });
                      setMode('resizing');
                    }}
                  />
                  <div
                    className="bg-white border border-primary position-absolute"
                    style={{ width: 8, height: 8, right: -4, top: -4, cursor: 'ne-resize' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setCorner('ne');
                      setInitialRect({ left: a.left, top: a.top, width: a.width, height: a.height });
                      setMode('resizing');
                    }}
                  />
                  <div
                    className="bg-white border border-primary position-absolute"
                    style={{ width: 8, height: 8, left: -4, bottom: -4, cursor: 'sw-resize' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setCorner('sw');
                      setInitialRect({ left: a.left, top: a.top, width: a.width, height: a.height });
                      setMode('resizing');
                    }}
                  />
                  <div
                    className="bg-white border border-primary position-absolute"
                    style={{ width: 8, height: 8, right: -4, bottom: -4, cursor: 'se-resize' }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      setCorner('se');
                      setInitialRect({ left: a.left, top: a.top, width: a.width, height: a.height });
                      setMode('resizing');
                    }}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 10 }}>
          <button className="btn btn-light btn-sm me-1" onClick={zoomOut} aria-label="zoom out">
            −
          </button>
          <button className="btn btn-light btn-sm me-1" onClick={zoomIn} aria-label="zoom in">
            +
          </button>
          <button className="btn btn-light btn-sm" onClick={resetZoom} aria-label="reset zoom">
            ⟳
          </button>
        </div>
      </div>
      <div className="border-start p-3" style={{ width: 320, flex: '0 0 320px' }}>
        <button className="btn btn-success float-end mb-3" onClick={handleExport}>Salva YAML</button>
        {selected ? (
          <div>
            <h5>Modifica</h5>
            <div className="mb-2">
              <label className="form-label" htmlFor="field_name">field_name</label>
              <input
                id="field_name"
                className="form-control"
                value={selected.field_name}
                onChange={e => updateSelected({ field_name: e.target.value })}
              />
            </div>
            <div className="mb-2">
              <label className="form-label">field_type</label>
              <select
                className="form-select"
                value={selected.field_type}
                onChange={e => {
                  const type = e.target.value;
                  const patch: Partial<Annotation> = { field_type: type };
                  if (type === 'testo') {
                    patch.font = selected.font || fonts[0];
                    patch.font_size = selected.font_size || 12;
                    patch.font_color = selected.font_color || '#000000';
                    patch.text_type = selected.text_type || textTypeOptions[0].value;
                    patch.text_align = selected.text_align || 'left';
                  } else {
                    patch.font = undefined;
                    patch.font_size = undefined;
                    patch.font_color = undefined;
                    patch.text_type = undefined;
                    patch.text_align = undefined;
                  }
                  updateSelected(patch);
                }}
              >
                {fieldTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            {selected.field_type === 'testo' && (
              <>
                <div className="mb-2">
                  <label className="form-label">text_type</label>
                  <input className="form-control" value={selected.text_type} onChange={e => updateSelected({ text_type: e.target.value })} />
                </div>                
                <div className="mb-2">
                  <label className="form-label">font</label>
                  <select className="form-select" value={selected.font} onChange={e => updateSelected({ font: e.target.value })}>
                    {[selected.font, ...fonts.filter(f => f !== selected.font)].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">font_size</label>
                  <input type="number" className="form-control" value={selected.font_size} onChange={e => updateSelected({ font_size: Number(e.target.value) })} />
                </div>
                <div className="mb-2">
                  <label className="form-label">font_color</label>
                  <input type="color" className="form-control form-control-color" value={selected.font_color} onChange={e => updateSelected({ font_color: e.target.value })} />
                </div>
                <div className="mb-2">
                  <label className="form-label">text_align</label>
                  <select className="form-select" value={selected.text_align} onChange={e => updateSelected({ text_align: e.target.value as 'left'|'center'|'right' })}>
                    {alignments.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">text_type</label>
                  <select className="form-select" value={selected.text_type} onChange={e => updateSelected({ text_type: e.target.value })}>
                    {textTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </>
            )}
            
            <button className="btn btn-danger" onClick={deleteSelected}>Elimina</button>
          </div>
        ) : (
          <p>Seleziona una bounding box o disegnane una nuova.</p>
        )}
        <hr />
        <h5>Annotazioni</h5>
          <ul
            className="list-group"
            onDragOver={e => e.preventDefault()}
            onDrop={() => {
              if (!draggingId) return;
              const from = annotations.findIndex(a => a.id === draggingId);
              if (from === annotations.length - 1) return;
              const newAnns = [...annotations];
              const [moved] = newAnns.splice(from, 1);
              newAnns.push(moved);
              setAnnotations(newAnns);
            }}
          >
            {annotations.map(a => (
              <li
                key={a.id}
                className={`list-group-item ${a.id === selectedId ? 'active' : ''} cursor-pointer`}
                onClick={() => setSelectedId(a.id)}
                draggable
                onDragStart={() => setDraggingId(a.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!draggingId || draggingId === a.id) return;
                  const newAnns = [...annotations];
                  const from = newAnns.findIndex(x => x.id === draggingId);
                  const to = newAnns.findIndex(x => x.id === a.id);
                  const [moved] = newAnns.splice(from, 1);
                  newAnns.splice(to, 0, moved);
                  setAnnotations(newAnns);
                }}
                onDragEnd={() => setDraggingId(null)}
              >
                {a.field_name || '(senza nome)'}
              </li>
            ))}
          </ul>
      </div>
    </div>
  );
};

export default AnnotatorPage;
