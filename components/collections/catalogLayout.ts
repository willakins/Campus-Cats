export const catalogColumnCount = (width: number, fontScale: number): 1 | 2 | 3 => {
  if (fontScale >= 1.5 || width < 360) return 1;
  return width >= 768 ? 3 : 2;
};
