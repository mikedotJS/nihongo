import { JA_FONTS, PALETTES } from '../data/palettes';
import type { JaFontId, PaletteId, PaletteTokens } from '../types';

export function getPalette(id: PaletteId, dark: boolean): PaletteTokens {
  return PALETTES[id][dark ? 'dark' : 'light'];
}

export function getJaFont(id: JaFontId): string {
  return JA_FONTS[id];
}
