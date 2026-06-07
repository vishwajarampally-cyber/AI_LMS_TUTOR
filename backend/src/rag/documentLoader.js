import fs from "fs/promises";
import path from "path";
import mammoth from "mammoth";
import JSZip from "jszip";

// pdf-parse is a legacy CJS module; use dynamic import with explicit path for Node v26 ESM compat
async function parsePdf(buffer) {
  try {
    // Try standard import first
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const result = await pdfParse(buffer);
    return result.text || "";
  } catch {
    // Fallback: try index directly
    const mod = await import("pdf-parse");
    const pdfParse = mod.default || mod;
    const result = await pdfParse(buffer);
    return result.text || "";
  }
}

export async function extractText(filePath, originalName = "") {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  let text = "";

  if (ext === ".pdf") {
    text = await parsePdf(buffer);
  } else if (ext === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value || "";
  } else if (ext === ".pptx") {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
    const slides = await Promise.all(slideFiles.map(async (name) => {
      const xml = await zip.files[name].async("string");
      return xml
        .match(/<a:t>[^<]*<\/a:t>/g)
        ?.map((node) => node.replace(/<\/?a:t>/g, ""))
        .join(" ") || "";
    }));
    text = slides.join("\n\n");
  } else if (ext === ".ppt") {
    text = "Legacy PPT files require conversion to PPTX before indexing.";
  } else {
    throw new Error("Unsupported file type");
  }

  const cleaned = String(text || "").trim();
  if (!cleaned) {
    throw new Error(
      "No extractable text was found in this document. Please upload a searchable PDF or convert scanned pages to a text-based PDF before indexing."
    );
  }

  return cleaned;
}
