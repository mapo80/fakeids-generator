import React, { useState } from 'react';

interface Props {
  onLoad: (img: string, imgName: string, yamlText?: string) => void;
}

const UploadPage: React.FC<Props> = ({ onLoad }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [yamlFile, setYamlFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    const imgData = await fileToDataUrl(imageFile) as string;
    let yamlText: string | undefined;
    if (yamlFile) {
      yamlText = await yamlFile.text();
    }
    onLoad(imgData, imageFile.name, yamlText);
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4">Carica documento</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Immagine</label>
          <input type="file" className="form-control" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} required />
        </div>
        <div className="mb-3">
          <label className="form-label">File YAML (facoltativo)</label>
          <input type="file" className="form-control" accept=".yaml,.yml" onChange={e => setYamlFile(e.target.files?.[0] || null)} />
        </div>
        <button type="submit" className="btn btn-primary">Carica</button>
      </form>
    </div>
  );
};

function fileToDataUrl(file: File): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default UploadPage;
