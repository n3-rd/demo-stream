// Mock implementation of canvas for environments where native modules can't be built
class CanvasElement {
  constructor() {
    this.width = 0;
    this.height = 0;
  }
  
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray() }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray() }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    };
  }
  
  toBuffer() {
    return Buffer.from([]);
  }
  
  toDataURL() {
    return '';
  }
}

class CanvasImage {
  constructor() {
    this.src = '';
    this.onload = () => {};
    this.onerror = () => {};
    this.width = 0;
    this.height = 0;
  }
}

// Export the mock implementations using ES modules
export const createCanvas = (width, height) => new CanvasElement(width, height);
export const loadImage = () => Promise.resolve(new CanvasImage());
export const Image = CanvasImage;
export const Canvas = CanvasElement;
export const registerFont = () => {};
export const createImageData = () => ({ data: new Uint8ClampedArray() });
export const parseFont = () => ({});
export const PNGStream = class PNGStream {};
export const JPEGStream = class JPEGStream {};
export const PDFStream = class PDFStream {};
export const DOMMatrix = class DOMMatrix {};
export const DOMPoint = class DOMPoint {};
export const version = '0.0.0-mock';

// Default export for compatibility
export default {
  createCanvas,
  loadImage,
  Image,
  Canvas,
  registerFont,
  createImageData,
  parseFont,
  PNGStream,
  JPEGStream,
  PDFStream,
  DOMMatrix,
  DOMPoint,
  version
}; 