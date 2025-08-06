import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import AnnotatorPage from '../components/AnnotatorPage';
import { Annotation } from '../types';

describe('drawing bounding boxes', () => {
  it('creates a rectangle when dragging on the image', async () => {
    const imgData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X5RfQAAAAASUVORK5CYII=';
    const Wrapper: React.FC = () => {
      const [annotations, setAnnotations] = React.useState<Annotation[]>([]);
      return <AnnotatorPage image={imgData} imageName="test.png" annotations={annotations} setAnnotations={setAnnotations} />;
    };
    const { container } = render(<Wrapper />);
    const img = screen.getByAltText('template') as HTMLImageElement;
    const wrapper = img.parentElement as HTMLElement;
    Object.defineProperty(wrapper, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 100, height: 100, right:100, bottom:100 })
    });
    fireEvent.mouseDown(img, { clientX: 10, clientY: 10, button: 0, shiftKey: true });
    fireEvent.mouseMove(img, { clientX: 60, clientY: 60 });
    fireEvent.mouseUp(img, { clientX: 60, clientY: 60, button: 0, shiftKey: true });
    await waitFor(() => {
      const boxes = container.querySelectorAll('[data-testid="bbox"]');
      expect(boxes.length).toBe(1);
      const box = boxes[0] as HTMLElement;
      expect(box.style.width).toBe('50px');
      expect(box.style.height).toBe('50px');
    });
  });
});
