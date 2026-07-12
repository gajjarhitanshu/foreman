export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const needsQuoting = /[",\n]/.test(cell);
          const escaped = cell.replace(/"/g, '""');
          return needsQuoting ? `"${escaped}"` : escaped;
        })
        .join(",")
    )
    .join("\n");
}
