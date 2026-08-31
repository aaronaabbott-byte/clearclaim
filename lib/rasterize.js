// Turn any uploaded document into flattened page images. Images become one
// page; PDFs (with or without a text layer) are rendered page by page. HEIC/HEIF
// photos (the default on iPhones) are converted to JPEG first, since most
// browsers can't decode them. Output is plain pixels (JPEG), which is what
// ClassWallet reliably accepts. Runs in the browser only.
const PDFJS_VER = "4.4.168";
async function loadPdfjs() {
  const p = await import(/* webpackIgnore: true */ `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.min.mjs`);
  p.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VER}/build/pdf.worker.min.mjs`;
  return p;
}

// Convert a HEIC/HEIF blob to a JPEG blob using heic2any (libheif WASM).
async function heicToJpeg(blob) {
  const mod = await import(/* webpackIgnore: true */ "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/+esm");
  const heic2any = mod.default || mod.heic2any || mod;
  const out = await heic2any({ blob, toType: "image/jpeg", quality: 0.92 });
  return Array.isArray(out) ? out[0] : out;
}
function looksHeic(blob) {
  const t = (blob.type || "").toLowerCase();
  const n = (blob.name || "").toLowerCase();
  return t.includes("heic") || t.includes("heif") || /\.heic$|\.heif$/.test(n);
}

// Rasterize a single image blob to { dataUrl, w, h }.
async function rasterImage(blob) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not read this image."));
    i.src = URL.createObjectURL(blob);
  });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  return { dataUrl: c.toDataURL("image/jpeg", 0.92), w: c.width, h: c.height };
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

  // image — convert HEIC/HEIF up front when we can tell.
  let imgBlob = blob;
  if (looksHeic(blob)) {
    try { imgBlob = await heicToJpeg(blob); } catch { imgBlob = blob; }
  }
  try {
    return [await rasterImage(imgBlob)];
  } catch (e) {
    // Fallback: a HEIC file with no clear type/name — try converting once.
    if (imgBlob === blob) {
      try { return [await rasterImage(await heicToJpeg(blob))]; } catch { /* fall through */ }
    }
    throw e;
  }
}
