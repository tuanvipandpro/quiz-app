export async function downloadAsset(url, filename, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok || !response.headers.get('content-type')?.includes('image/png'))
    throw new Error('Image download failed');
  const blob = await response.blob();
  if (signal.aborted) return;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
