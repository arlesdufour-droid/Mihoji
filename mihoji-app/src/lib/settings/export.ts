export function getExportFilename(date = new Date()) {
  const datePart = date.toISOString().slice(0, 10);
  return `mihoji-export-${datePart}.json`;
}

export function getExportHeaders(date = new Date()) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${getExportFilename(date)}"`,
    'Cache-Control': 'no-store',
  };
}
