import fs from "fs/promises";
import path from "path";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";

export async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === ".pdf") {
    const parsed = await pdf(buffer);
    return parsed.text;
  }

  if (ext === ".docx") {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value;
  }

  if (ext === ".pptx") {
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
    return slides.join("\n\n");
  }

  if (ext === ".ppt") {
    return "Legacy PPT files require conversion to PPTX before indexing.";
  }

  throw new Error("Unsupported file type");
}
