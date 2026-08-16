export function toCsvRow(cells: unknown[]): string {
  return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
}