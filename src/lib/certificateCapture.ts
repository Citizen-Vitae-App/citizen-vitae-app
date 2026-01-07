import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const downloadCertificateAsImage = async (
  element: HTMLElement,
  filename: string = 'certificat.pdf'
): Promise<void> => {
  // Capture the element as canvas with high quality
  const canvas = await html2canvas(element, {
    scale: 3, // High resolution
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  // Get image dimensions
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Calculate PDF dimensions (A4 landscape in mm)
  const pdfWidth = 297;
  const pdfHeight = 210;

  // Fit the captured certificate into the PDF WITHOUT artificial margins,
  // so the downloaded file matches what the user sees as closely as possible.
  const aspectRatio = imgWidth / imgHeight;
  const pdfAspectRatio = pdfWidth / pdfHeight;

  let finalWidth: number;
  let finalHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (aspectRatio > pdfAspectRatio) {
    // Image is wider than the page ratio -> fit to full page width
    finalWidth = pdfWidth;
    finalHeight = finalWidth / aspectRatio;
    offsetX = 0;
    offsetY = (pdfHeight - finalHeight) / 2;
  } else {
    // Image is taller than the page ratio -> fit to full page height
    finalHeight = pdfHeight;
    finalWidth = finalHeight * aspectRatio;
    offsetX = (pdfWidth - finalWidth) / 2;
    offsetY = 0;
  }

  // Create PDF in landscape A4
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Add the image to PDF
  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', offsetX, offsetY, finalWidth, finalHeight);

  // Download the PDF
  pdf.save(filename);
};
