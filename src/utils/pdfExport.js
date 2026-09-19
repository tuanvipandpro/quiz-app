import { jsPDF } from 'jspdf';

const PAGE_MARGIN = 16;
const FOOTER_MARGIN = 10;
const BODY_FONT_SIZE = 10;
const BODY_LINE_HEIGHT = 4.8;
const MAX_IMAGE_HEIGHT = 90;
const IMAGE_GAP = 4;

const normalizeText = (value) => String(value ?? '')
  // Repair common mojibake in the bundled quiz data before jsPDF encodes it.
  .replace(/ג€"/g, '-')
  .replace(/ג€¢/g, '-')
  .replace(/ג—‹/g, '->')
  .replace(/ג€/g, '"')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/[–—]/g, '-')
  .replace(/[•✑]/g, '-')
  .replace(/→/g, '->')
  .replace(/≠/g, '!=')
  .replace(/±/g, '+/-');

const sanitizeFileName = (value) => {
  const normalized = String(value || 'quiz-questions')
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || 'quiz-questions';
};

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = BODY_LINE_HEIGHT) => {
  const lines = doc.splitTextToSize(normalizeText(text), maxWidth);
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottom = pageHeight - PAGE_MARGIN - FOOTER_MARGIN;

  if (y > PAGE_MARGIN && y + (lines.length * lineHeight) > pageBottom) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  lines.forEach((line) => {
    if (y > pageBottom) {
      doc.addPage();
      y = PAGE_MARGIN;
    }

    doc.text(line, x, y);
    y += lineHeight;
  });

  return y;
};

const addPageIfNeeded = (doc, y, requiredHeight) => {
  const pageHeight = doc.internal.pageSize.getHeight();

  if (y + requiredHeight > pageHeight - PAGE_MARGIN - FOOTER_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }

  return y;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Failed to read image data'));
  reader.readAsDataURL(blob);
});

const loadImage = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Failed to decode image'));
  image.src = dataUrl;
});

const convertImageToPng = (image) => {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  if (!canvas.width || !canvas.height) {
    throw new Error('Image has invalid dimensions');
  }

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');

  context.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
};

const getImageFormat = (mimeType, dataUrl) => {
  const type = String(mimeType || dataUrl || '').toLowerCase();

  if (type.includes('jpeg') || type.includes('jpg')) return 'JPEG';
  if (type.includes('webp')) return 'WEBP';
  if (type.includes('png')) return 'PNG';
  return null;
};

const fetchImageForPdf = async (imageUrl) => {
  const response = await fetch(String(imageUrl).trim(), { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Image request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const dataUrl = await blobToDataUrl(blob);
  const image = await loadImage(dataUrl);
  const originalFormat = getImageFormat(blob.type, dataUrl);

  if (originalFormat) {
    return {
      dataUrl,
      format: originalFormat,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    };
  }

  return {
    dataUrl: convertImageToPng(image),
    format: 'PNG',
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
};

const addImage = (doc, image, y, contentWidth) => {
  if (!image.width || !image.height) throw new Error('Image has invalid dimensions');

  const scale = Math.min(
    contentWidth / image.width,
    MAX_IMAGE_HEIGHT / image.height,
    1,
  );
  const width = image.width * scale;
  const height = image.height * scale;
  const imageY = addPageIfNeeded(doc, y, height + IMAGE_GAP);

  doc.addImage(image.dataUrl, image.format, PAGE_MARGIN, imageY, width, height, undefined, 'FAST');
  return imageY + height + IMAGE_GAP;
};

const addFooters = (doc, title) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.text(`${title} - Page ${page} of ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 6, {
      align: 'right',
    });
  }

  doc.setTextColor(0, 0, 0);
};

export const exportQuestionsAsPdf = async (questions, quizName = 'Quiz Questions') => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions available to export');
  }

  const title = normalizeText(String(quizName || 'Quiz Questions').trim() || 'Quiz Questions');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (PAGE_MARGIN * 2);
  let y = PAGE_MARGIN;

  doc.setProperties({ title, subject: 'Quiz questions' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  y = addWrappedText(doc, title, PAGE_MARGIN, y, contentWidth, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  y = addWrappedText(doc, `${questions.length} questions`, PAGE_MARGIN, y + 2, contentWidth, 5);
  doc.setTextColor(0, 0, 0);
  y += 5;
  const failedImages = [];

  for (const [index, question] of questions.entries()) {
    y = addPageIfNeeded(doc, y, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = addWrappedText(
      doc,
      `${index + 1}. ${question.question || 'Untitled question'}`,
      PAGE_MARGIN,
      y,
      contentWidth,
      5.8,
    );
    y += 1.5;

    if (typeof question.imageUrl === 'string' && question.imageUrl.trim()) {
      try {
        const image = await fetchImageForPdf(question.imageUrl);
        y = addImage(doc, image, y, contentWidth);
      } catch (error) {
        failedImages.push(index + 1);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(130, 130, 130);
        y = addWrappedText(doc, 'Image could not be included (unavailable or blocked by CORS).', PAGE_MARGIN + 5, y, contentWidth - 5, 4.2);
        doc.setTextColor(0, 0, 0);
      }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(BODY_FONT_SIZE);
    Object.entries(question.options || {}).forEach(([key, value]) => {
      y = addWrappedText(doc, `${key}. ${value}`, PAGE_MARGIN + 5, y, contentWidth - 5);
    });

    if (Array.isArray(question.answer) && question.answer.length > 0) {
      y += 1;
      doc.setFont('helvetica', 'bold');
      y = addWrappedText(doc, `Correct answer: ${question.answer.join(', ')}`, PAGE_MARGIN + 5, y, contentWidth - 5);
    }

    y += 5;
  }

  addFooters(doc, title);

  const fileName = `${sanitizeFileName(title)}.pdf`;
  doc.save(fileName);
  return { fileName, failedImages };
};
