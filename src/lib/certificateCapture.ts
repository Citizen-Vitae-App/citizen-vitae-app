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

  // Calculate scaling to fit the certificate in the PDF
  const aspectRatio = imgWidth / imgHeight;
  const pdfAspectRatio = pdfWidth / pdfHeight;

  let finalWidth: number;
  let finalHeight: number;
  let offsetX: number;
  let offsetY: number;

  if (aspectRatio > pdfAspectRatio) {
    // Image is wider, fit to width
    finalWidth = pdfWidth - 20; // 10mm margin on each side
    finalHeight = finalWidth / aspectRatio;
    offsetX = 10;
    offsetY = (pdfHeight - finalHeight) / 2;
  } else {
    // Image is taller, fit to height
    finalHeight = pdfHeight - 20; // 10mm margin on top and bottom
    finalWidth = finalHeight * aspectRatio;
    offsetX = (pdfWidth - finalWidth) / 2;
    offsetY = 10;
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
