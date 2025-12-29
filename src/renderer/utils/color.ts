/**
 * Tiny colour-utility shared by Agents, Workspaces and (soon) other pages.
 *
 * We intentionally keep the implementation vanilla-JS so it can be used from
 * both TSX components and plain JS helpers without transpiler complaints.
 */

// Return a random integer within min..max (inclusive)
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Produce an aesthetically pleasing random HSL triplet
const generateRandomHsl = (): { h: number; s: number; l: number } => ({
  h: randomInt(0, 360),
  s: randomInt(42, 98),
  l: randomInt(40, 90),
});

// Convert an HSL colour to a HEX string
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
  } else if (120 <= h && h < 180) {
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    b = x;
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (val: number): string => val.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const generateNiceRandomHexColor = (): string => {
  const { h, s, l } = generateRandomHsl();
  return hslToHex(h, s, l);
};

// Re-export helpers in case we want them elsewhere
export { randomInt, generateRandomHsl, hslToHex };
