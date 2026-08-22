// Turn any uploaded document into flattened page images. Images become one
// page; PDFs (with or without a text layer) are rendered page by page. Output
// is plain pixels (JPEG), which is what ClassWallet reliably accepts. Runs in
// the browser only.
const PDFJS_VER = "4.4.168";
async function loadPdfjs() {
  const p = await import(/* webpackIgnore: true */ `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.min.mjs`);
  p.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.worker.min.mjs`;
  return p;
}

// Returns [{ dataUrl, w, h }] for the file. Throws on an unreadable PDF.
export async function fileToPages(blob, scale = 2) {
  const type = blob.type || "";
  if (type === "application/pdf") {
    const pdfjs = await loadPdfjs();
    const buf = await blob.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale });
      const c = document.createElement("canvas");
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      pages.push({ dataUrl: c.toDataURL("image/jpeg", 0.92), w: c.width, h: c.height });
    }
    return pages;
  }
  // image
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read this image."));
    i.src = URL.createObjectURL(blob);
  });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return [{ dataUrl: c.toDataURL("image/jpeg", 0.92), w: c.width, h: c.height }];
}
