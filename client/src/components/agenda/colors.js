function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
    .join('');
}

function mix(hex, target, amount) {
  const c = hexToRgb(hex);
  return rgbToHex(
    c.r + (target.r - c.r) * amount,
    c.g + (target.g - c.g) * amount,
    c.b + (target.b - c.b) * amount
  );
}

export function deriveColors(accent) {
  return {
    bg: mix(accent, { r: 255, g: 255, b: 255 }, 0.87),
    text: mix(accent, { r: 0, g: 0, b: 0 }, 0.45),
    border: accent
  };
}
