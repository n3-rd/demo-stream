// Mock implementation of canvas for environments where native modules can't be built
class Canvas {
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

class Image {
  constructor() {
    this.src = '';
    this.onload = () => {};
    this.onerror = () => {};
    this.width = 0;
    this.height = 0;
  }
}

// Export the mock implementations
module.exports = {
  createCanvas: (width, height) => new Canvas(width, height),
  loadImage: () => Promise.resolve(new Image()),
  Image,
  Canvas,
  registerFont: () => {},
  createImageData: () => ({ data: new Uint8ClampedArray() }),
  parseFont: () => ({}),
  PNGStream: class PNGStream {},
  JPEGStream: class JPEGStream {},
  PDFStream: class PDFStream {},
  DOMMatrix: class DOMMatrix {},
  DOMPoint: class DOMPoint {},
  version: '0.0.0-mock'
}; 