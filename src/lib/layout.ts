export function getCardWidth(index: number): number {
  const row = Math.floor(index / 2);
  const col = index % 2;
  const patterns = [[50, 50], [40, 60], [55, 45]];
  return patterns[row % 3][col];
}
