import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

export type PdfLineItem = {
  description: string;
  quantity: number;
  unitPricePence: number;
  amountPence: number;
};

export type CompanyDetails = {
  name: string;
  address: string;
  email: string;
  phone: string;
  bankName: string;
  bankAccountName: string;
  bankSortCode: string;
  bankAccountNumber: string;
};

export type DocumentPdfInput = {
  kind: 'quote' | 'invoice';
  reference: string;
  title: string;
  issueDate: string;
  secondaryDateLabel: string;
  secondaryDate: string;
  status: string;
  contact: { name: string; company?: string; email?: string; address?: string };
  items: PdfLineItem[];
  subtotalPence: number;
  vatRate: number;
  vatPence: number;
  discountPence: number;
  totalPence: number;
  terms?: string;
  notes?: string;
  paymentDetails?: string;
  company: CompanyDetails;
  signingUrl?: string;
};

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const NAVY = rgb(0.09, 0.15, 0.24);
const AMBER = rgb(0.96, 0.65, 0.11);
const SLATE = rgb(0.33, 0.4, 0.5);
const INK = rgb(0.13, 0.19, 0.28);
const LINE = rgb(0.85, 0.89, 0.93);
const WHITE = rgb(1, 1, 1);

function money(pence: number): string {
  const value = (Math.round(pence) / 100).toFixed(2);
  return `£${value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function safe(value: string): string {
  return String(value || '').replace(/[^\x20-\x7E£]/g, ' ');
}

export { money as formatPoundsFromPence };

export async function renderDocumentPdf(input: DocumentPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const contentWidth = A4.width - MARGIN * 2;

  let page: PDFPage = doc.addPage([A4.width, A4.height]);
  let y = A4.height - MARGIN;

  const newPage = () => {
    page = doc.addPage([A4.width, A4.height]);
    const label = safe(`${input.kind === 'quote' ? 'Quotation' : 'Invoice'} ${input.reference}`);
    page.drawRectangle({ x: 0, y: A4.height - 28, width: A4.width, height: 28, color: NAVY });
    page.drawText(safe(input.company.name), { x: MARGIN, y: A4.height - 19, size: 9, font: bold, color: WHITE });
    page.drawText(label, { x: A4.width - MARGIN - regular.widthOfTextAtSize(label, 9), y: A4.height - 19, size: 9, font: regular, color: WHITE });
    y = A4.height - 48;
  };

  // Branded header band
  page.drawRectangle({ x: 0, y: A4.height - 120, width: A4.width, height: 120, color: NAVY });
  page.drawRectangle({ x: MARGIN, y: A4.height - 74, width: 46, height: 46, color: AMBER });
  page.drawText('O', { x: MARGIN + 14, y: A4.height - 63, size: 26, font: bold, color: NAVY });
  page.drawText(safe(input.company.name), { x: MARGIN + 60, y: A4.height - 48, size: 17, font: bold, color: WHITE });
  page.drawText(safe(input.company.address), { x: MARGIN + 60, y: A4.height - 64, size: 8.5, font: regular, color: rgb(0.78, 0.84, 0.9) });
  page.drawText(safe(`${input.company.email}   ${input.company.phone}`), { x: MARGIN + 60, y: A4.height - 77, size: 8.5, font: regular, color: rgb(0.78, 0.84, 0.9) });

  const docLabel = input.kind === 'quote' ? 'QUOTATION' : 'INVOICE';
  page.drawText(docLabel, { x: A4.width - MARGIN - bold.widthOfTextAtSize(docLabel, 20), y: A4.height - 52, size: 20, font: bold, color: AMBER });
  const refLabel = safe(input.reference);
  page.drawText(refLabel, { x: A4.width - MARGIN - regular.widthOfTextAtSize(refLabel, 10), y: A4.height - 68, size: 10, font: regular, color: WHITE });
  const statusLabel = safe(input.status.toUpperCase());
  page.drawText(statusLabel, { x: A4.width - MARGIN - regular.widthOfTextAtSize(statusLabel, 8.5), y: A4.height - 82, size: 8.5, font: regular, color: rgb(0.78, 0.84, 0.9) });

  y = A4.height - 140;

  // Dates (right) and prepared-for block (left)
  const rightX = A4.width - MARGIN;
  let dateY = y;
  for (const [label, value] of [[ 'Issue date', input.issueDate ], [ input.secondaryDateLabel, input.secondaryDate ]] as [string, string][]) {
    const valueText = safe(value || '-');
    page.drawText(safe(label), { x: rightX - 150, y: dateY, size: 8.5, font: regular, color: SLATE });
    page.drawText(valueText, { x: rightX - regular.widthOfTextAtSize(valueText, 9), y: dateY, size: 9, font: bold, color: INK });
    dateY -= 14;
  }

  page.drawText(input.kind === 'quote' ? 'PREPARED FOR' : 'BILL TO', { x: MARGIN, y, size: 8, font: bold, color: SLATE });
  y -= 14;
  const contactLines: string[] = [input.contact.name];
  if (input.contact.company) contactLines.push(input.contact.company);
  if (input.contact.address) contactLines.push(input.contact.address);
  if (input.contact.email) contactLines.push(input.contact.email);
  for (const line of contactLines) {
    for (const piece of wrap(line, regular, 9.5, 280)) {
      page.drawText(safe(piece), { x: MARGIN, y, size: 9.5, font: regular, color: INK });
      y -= 12;
    }
  }

  y = Math.min(y - 10, dateY - 10);

  for (const piece of wrap(input.title, bold, 13, contentWidth)) {
    page.drawText(safe(piece), { x: MARGIN, y, size: 13, font: bold, color: NAVY });
    y -= 16;
  }
  y -= 6;

  // Items table
  const colQty = MARGIN + contentWidth - 220;
  const colUnit = MARGIN + contentWidth - 140;
  const colAmount = MARGIN + contentWidth;
  page.drawRectangle({ x: MARGIN, y: y - 4, width: contentWidth, height: 18, color: rgb(0.96, 0.97, 0.99) });
  page.drawText('DESCRIPTION', { x: MARGIN + 6, y: y + 1, size: 7.5, font: bold, color: SLATE });
  page.drawText('QTY', { x: colQty, y: y + 1, size: 7.5, font: bold, color: SLATE });
  page.drawText('UNIT', { x: colUnit, y: y + 1, size: 7.5, font: bold, color: SLATE });
  page.drawText('AMOUNT', { x: colAmount - bold.widthOfTextAtSize('AMOUNT', 7.5), y: y + 1, size: 7.5, font: bold, color: SLATE });
  y -= 20;

  const items = input.items.length ? input.items : [{ description: input.title, quantity: 1, unitPricePence: input.totalPence, amountPence: input.totalPence }];
  for (const item of items) {
    const descriptionLines = wrap(item.description, regular, 9, colQty - MARGIN - 24);
    const rowHeight = Math.max(descriptionLines.length * 12 + 8, 22);
    if (y - rowHeight < 150) newPage();
    let lineY = y;
    for (const line of descriptionLines) {
      page.drawText(safe(line), { x: MARGIN + 6, y: lineY, size: 9, font: regular, color: INK });
      lineY -= 12;
    }
    page.drawText(safe(String(item.quantity)), { x: colQty, y, size: 9, font: regular, color: INK });
    page.drawText(safe(money(item.unitPricePence)), { x: colUnit, y, size: 9, font: regular, color: INK });
    const amountText = safe(money(item.amountPence));
    page.drawText(amountText, { x: colAmount - regular.widthOfTextAtSize(amountText, 9), y, size: 9, font: bold, color: INK });
    y -= rowHeight;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + contentWidth, y }, thickness: 0.5, color: LINE });
    y -= 4;
  }

  y -= 8;

  // Totals
  const totalsX = A4.width - MARGIN - 210;
  const totalRow = (label: string, value: string, strong = false) => {
    const font = strong ? bold : regular;
    const size = strong ? 11 : 9;
    page.drawText(safe(label), { x: totalsX, y, size: 9, font: regular, color: SLATE });
    page.drawText(safe(value), { x: A4.width - MARGIN - font.widthOfTextAtSize(safe(value), size), y, size, font, color: strong ? NAVY : INK });
    y -= strong ? 18 : 14;
  };
  totalRow('Subtotal', money(input.subtotalPence));
  if (input.discountPence > 0) totalRow('Discount', `-${money(input.discountPence)}`);
  totalRow(`VAT (${input.vatRate}%)`, money(input.vatPence));
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: A4.width - MARGIN, y: y + 8 }, thickness: 0.8, color: LINE });
  totalRow(input.kind === 'quote' ? 'Total quotation' : 'Total due', money(input.totalPence), true);

  y -= 6;

  // Payment details, terms, notes and signing link
  const block = (heading: string, value: string) => {
    const lines = wrap(value, regular, 8.5, contentWidth);
    if (y - (lines.length * 11 + 26) < 80) newPage();
    page.drawText(heading, { x: MARGIN, y, size: 8, font: bold, color: SLATE });
    y -= 13;
    for (const line of lines) {
      page.drawText(safe(line), { x: MARGIN, y, size: 8.5, font: regular, color: INK });
      y -= 11;
    }
    y -= 8;
  };

  if (input.kind === 'invoice' && input.paymentDetails) block('PAYMENT DETAILS', input.paymentDetails);
  if (input.terms) block('TERMS', input.terms);
  if (input.notes) block('NOTES', input.notes);
  if (input.signingUrl) block('SIGN ONLINE', input.signingUrl);

  // Footer on every page
  const pages = doc.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: MARGIN, y: 46 }, end: { x: A4.width - MARGIN, y: 46 }, thickness: 0.5, color: LINE });
    current.drawText(safe(`${input.company.name} - ${input.kind === 'quote' ? 'Quotation' : 'Invoice'} ${input.reference}`), { x: MARGIN, y: 34, size: 7.5, font: regular, color: SLATE });
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    current.drawText(pageLabel, { x: A4.width - MARGIN - regular.widthOfTextAtSize(pageLabel, 7.5), y: 34, size: 7.5, font: regular, color: SLATE });
  });

  return doc.save();
}


