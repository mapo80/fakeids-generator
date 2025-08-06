import React, { useState } from 'react';
import UploadPage from './components/UploadPage';
import AnnotatorPage from './components/AnnotatorPage';
import { Annotation } from './types';
import { loadYaml } from './utils/yaml';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  const handleLoad = (img: string, imgName: string, yamlText?: string) => {
    setImage(img);
    setImageName(imgName);
    if (yamlText) {
      setAnnotations(loadYaml(yamlText));
    } else {
      setAnnotations([]);
    }
  };

  if (!image) {
    return <UploadPage onLoad={handleLoad} />;
  }
  return <AnnotatorPage image={image} imageName={imageName} annotations={annotations} setAnnotations={setAnnotations} />;
};

export default App;
