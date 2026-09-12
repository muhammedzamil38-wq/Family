import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

/**
 * Extracts page one of a PDF and saves it as a PNG cover thumbnail.
 * Uses pdftoppm (poppler-utils) at the OS level.
 * Falls back to a dummy thumbnail in local development if pdftoppm is missing.
 * 
 * @param {string} pdfPath - Path to the PDF file on disk.
 * @param {string} outputDir - Directory where the cover thumbnail should be saved.
 * @param {string} filePrefix - Filename prefix (typically the book slug).
 * @returns {Promise<string>} The path to the generated cover image.
 */
export async function generatePdfCover(pdfPath, outputDir, filePrefix) {
  const outputPathNoExt = path.join(outputDir, filePrefix);
  const expectedCoverPath = outputPathNoExt + '.png';

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Command details:
    // -png: Generate a PNG file
    // -f 1 -l 1: Render only the first page
    // -singlefile: Output exactly one file and do not append suffix (like -1.png)
    const cmd = `pdftoppm -png -f 1 -l 1 -singlefile "${pdfPath}" "${outputPathNoExt}"`;
    await execPromise(cmd);

    if (fs.existsSync(expectedCoverPath)) {
      console.log(`Successfully generated PDF cover for: ${filePrefix}`);
      return expectedCoverPath;
    }
    throw new Error('Cover file was not found on disk after execution.');
  } catch (error) {
    console.error(`pdftoppm cover extraction failed for ${filePrefix}:`, error.message);

    // Graceful fallback for local development if pdftoppm is not in the system PATH (e.g. local Windows dev)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Generating dummy fallback PNG cover for local development...');
      
      // 1x1 transparent PNG base64
      const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      fs.writeFileSync(expectedCoverPath, Buffer.from(dummyPngBase64, 'base64'));
      return expectedCoverPath;
    }

    throw new Error(`PDF cover extraction failed: ${error.message}`);
  }
}
