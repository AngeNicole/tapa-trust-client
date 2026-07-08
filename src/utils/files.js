// Read a File into a data URL for upload. Images are downscaled + re-encoded as
// JPEG to keep payloads small; non-images (e.g. PDF) pass through unchanged.
// Returns { name, type, dataUrl }.
export function fileToDataUrl(file, maxDim = 1000) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file — please try another.'));
    reader.onload = () => {
      const src = reader.result;
      if (!file.type || !file.type.startsWith('image/')) {
        resolve({ name: file.name, type: file.type || 'application/octet-stream', dataUrl: src });
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const cw = Math.max(1, Math.round(img.width * scale));
        const ch = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
        resolve({ name: file.name, type: 'image/jpeg', dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
      };
      img.onerror = () => resolve({ name: file.name, type: file.type, dataUrl: src }); // keep original if decode fails
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
