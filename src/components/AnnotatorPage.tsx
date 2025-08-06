import React, { useRef, useState } from 'react';
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
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x:0, y:0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== wrapperRef.current) return;
    const rect = wrapperRef.current!.getBoundingClientRect();
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDrawing(true);
    const id = crypto.randomUUID();
    const newAnn: Annotation = {
      id,
      field_name: '',
      font: '',
      font_size: 12,
      font_color: '#000000',
      field_type: 'testo',
      left: e.clientX - rect.left,
      top: e.clientY - rect.top,
      width: 0,
      height: 0,
    };
    setAnnotations([...annotations, newAnn]);
    setSelectedId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !selectedId) return;
    const rect = wrapperRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setAnnotations(annotations.map(a => a.id === selectedId ? {
      ...a,
      left: Math.min(start.x, x),
      top: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y)
    } : a));
  };

  const handleMouseUp = () => setDrawing(false);

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
      <div className="flex-grow-1 position-relative image-wrapper" ref={wrapperRef}
           onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <img src={image} alt="template" className="w-100" />
        {annotations.map(a => (
          <div key={a.id}
               className={`position-absolute border ${a.id === selectedId ? 'border-primary' : 'border-danger'}`}
               style={{ left:a.left, top:a.top, width:a.width, height:a.height }}
               onClick={(e)=>{ e.stopPropagation(); setSelectedId(a.id); }} />
        ))}
      </div>
      <div className="border-start p-3" style={{ width: 320 }}>
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
