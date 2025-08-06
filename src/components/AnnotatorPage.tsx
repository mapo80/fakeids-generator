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

const AnnotatorPage: React.FC<Props> = ({ image, imageName, annotations, setAnnotations }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'none'|'drawing'|'moving'|'resizing'|'panning'>('none');
  const [start, setStart] = useState({ x:0, y:0 });
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [initialRect, setInitialRect] = useState({ left:0, top:0, width:0, height:0 });
  const [corner, setCorner] = useState<'nw'|'ne'|'sw'|'se'|null>(null);
  const [zoom, setZoom] = useState(1);
  const [baseZoom, setBaseZoom] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [panStart, setPanStart] = useState<{x:number,y:number,scrollLeft:number,scrollTop:number}|null>(null);

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
    if (mode === 'none' && e.target !== wrapperRef.current && (e.target as HTMLElement).tagName !== 'IMG') return;
    if (mode === 'none' && e.button === 0 && !e.shiftKey) {
      setPanStart({ x: e.clientX, y: e.clientY, scrollLeft: wrapperRef.current!.scrollLeft, scrollTop: wrapperRef.current!.scrollTop });
      setMode('panning');
      return;
    }
    const rect = wrapperRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left + wrapperRef.current!.scrollLeft) / zoom;
    const y = (e.clientY - rect.top + wrapperRef.current!.scrollTop) / zoom;
    if (mode === 'drawing') {
      if (e.button === 2) { // cancel with right click
        cancelDrawing();
        return;
      }
      if (e.button !== 0) return;
      const width = Math.abs(x - start.x);
      const height = Math.abs(y - start.y);
      if (width < 1 || height < 1) {
        cancelDrawing();
        return;
      }
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
      setMode('none');
      return;
    }
    if (mode === 'none' && e.button === 0 && e.shiftKey) {
      // start drawing
      setStart({ x, y });
      setMode('drawing');
      const id = crypto.randomUUID();
      const newAnn: Annotation = {
        id,
        field_name: '',
        font: '',
        font_size: 12,
        font_color: '#000000',
        field_type: 'testo',
        left: x,
        top: y,
        width: 0,
        height: 0,
      };
      setAnnotations([...annotations, newAnn]);
      setSelectedId(id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === 'panning' && panStart) {
      wrapperRef.current!.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
      wrapperRef.current!.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
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

  const handleMouseUp = () => {
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
    <div className="d-flex">
      <div className="flex-grow-1 position-relative image-wrapper overflow-auto" ref={wrapperRef}
           onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
           onContextMenu={e => e.preventDefault()} style={{ cursor: mode === 'panning' ? 'grabbing' : 'grab' }}>
        <img ref={imgRef} src={image} alt="template"
             style={{ width: imgSize.width ? imgSize.width * zoom : undefined,
                      height: imgSize.height ? imgSize.height * zoom : undefined }}
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
             }} />
        {annotations.map(a => (
          <div key={a.id}
               data-testid="bbox"
               className={`position-absolute border ${a.id === selectedId ? 'border-primary' : 'border-danger'}`}
               style={{ left:a.left*zoom, top:a.top*zoom, width:a.width*zoom, height:a.height*zoom }}
               onMouseDown={(e)=>{
                 e.stopPropagation();
                 setSelectedId(a.id);
                 const rect = e.currentTarget.getBoundingClientRect();
                 setOffset({ x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom });
                 setMode('moving');
               }}>
            {a.id === selectedId && (
              <>
                <div className="bg-white border border-primary position-absolute" style={{width:8,height:8,left:-4,top:-4,cursor:'nw-resize'}}
                     onMouseDown={(e)=>{ e.stopPropagation(); setCorner('nw'); setInitialRect({left:a.left,top:a.top,width:a.width,height:a.height}); setMode('resizing'); }} />
                <div className="bg-white border border-primary position-absolute" style={{width:8,height:8,right:-4,top:-4,cursor:'ne-resize'}}
                     onMouseDown={(e)=>{ e.stopPropagation(); setCorner('ne'); setInitialRect({left:a.left,top:a.top,width:a.width,height:a.height}); setMode('resizing'); }} />
                <div className="bg-white border border-primary position-absolute" style={{width:8,height:8,left:-4,bottom:-4,cursor:'sw-resize'}}
                     onMouseDown={(e)=>{ e.stopPropagation(); setCorner('sw'); setInitialRect({left:a.left,top:a.top,width:a.width,height:a.height}); setMode('resizing'); }} />
                <div className="bg-white border border-primary position-absolute" style={{width:8,height:8,right:-4,bottom:-4,cursor:'se-resize'}}
                     onMouseDown={(e)=>{ e.stopPropagation(); setCorner('se'); setInitialRect({left:a.left,top:a.top,width:a.width,height:a.height}); setMode('resizing'); }} />
              </>
            )}
          </div>
        ))}
        <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 10 }}>
          <button className="btn btn-light btn-sm me-1" onClick={zoomOut} aria-label="zoom out">−</button>
          <button className="btn btn-light btn-sm me-1" onClick={zoomIn} aria-label="zoom in">+</button>
          <button className="btn btn-light btn-sm" onClick={resetZoom} aria-label="reset zoom">⟳</button>
        </div>
      </div>
      <div className="border-start p-3" style={{ width: 320, flex: '0 0 320px' }}>
        <button className="btn btn-success float-end mb-3" onClick={handleExport}>Salva YAML</button>
        {selected ? (
          <div>
            <h5>Modifica</h5>
            <div className="mb-2">
              <label className="form-label">field_name</label>
              <input className="form-control" value={selected.field_name} onChange={e => updateSelected({ field_name: e.target.value })} />
            </div>
            <div className="mb-2">
              <label className="form-label">font</label>
              <input className="form-control" value={selected.font} onChange={e => updateSelected({ font: e.target.value })} />
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
              <label className="form-label">field_type</label>
              <select className="form-select" value={selected.field_type} onChange={e => updateSelected({ field_type: e.target.value })}>
                {fieldTypes.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button className="btn btn-danger" onClick={deleteSelected}>Elimina</button>
          </div>
        ) : (
          <p>Seleziona una bounding box o disegnane una nuova.</p>
        )}
        <hr />
        <h5>Annotazioni</h5>
        <ul className="list-group">
          {annotations.map(a => (
            <li key={a.id} className={`list-group-item ${a.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(a.id)}>
              {a.field_name || '(senza nome)'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnnotatorPage;
