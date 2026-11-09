export const parseRgb = (colour: string) => {
  let r: number, g: number, b: number;

  if (colour.startsWith('#')) {
    const hex = colour.slice(1);
    if (hex.length === 3) {
      r = parseInt(hex[0]! + hex[0]!, 16);
      g = parseInt(hex[1]! + hex[1]!, 16);
      b = parseInt(hex[2]! + hex[2]!, 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      throw new Error('Invalid hex colour format');
    }
  } else {
    const rgbaMatch = colour.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (!rgbaMatch) throw new Error('Invalid colour format');
    r = parseInt(rgbaMatch[1]!);
    g = parseInt(rgbaMatch[2]!);
    b = parseInt(rgbaMatch[3]!);
  }

  return { r, g, b };
};

export const toHex = (colour: string) => {
  const { r, g, b } = parseRgb(colour);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

const luminance = (colour: string) => {
  const { r, g, b } = parseRgb(colour);
  const linear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

export const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

export const DARK_TEXT = '#0b0c10';
export const LIGHT_TEXT = '#ffffff';

export const textColourOn = (background: string) => (contrast(background, DARK_TEXT) >= contrast(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT);
