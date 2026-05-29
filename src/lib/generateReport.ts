import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, convertInchesToTwip, SectionType,
} from "docx";

export type ReportType = "summary" | "continuation";

export interface ReportData {
  reportType: ReportType;
  familyName: string;
  childName: string;
  idNumber: string;
  dateOfBirth: string;
  dateRange: string;
  treatmentCount: string;
  background: string;
  goals: string;       // one goal per line
  progress: string;
  summary: string;
  logoArrayBuffer?: ArrayBuffer;
  signatureArrayBuffer?: ArrayBuffer;
  logoMime?: string;      // 'image/png' | 'image/jpeg' | 'image/webp'
  signatureMime?: string;
}

const FONT = "Arial";
const SIZE = 22;       // 11pt (half-points)
const RTL = true;

/** Scale dimensions so width <= maxWidth, maintaining aspect ratio */
function scaleToMaxWidth(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number
): { width: number; height: number } {
  if (srcWidth <= maxWidth) return { width: srcWidth, height: srcHeight };
  const ratio = maxWidth / srcWidth;
  return { width: Math.round(maxWidth), height: Math.round(srcHeight * ratio) };
}

function mimeToImageType(mime: string): "png" | "jpg" | "gif" | "bmp" {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp") return "bmp";
  return "png"; // default for webp / unknown — docx may not support webp natively
}

function rtlParagraph(text: string, opts?: {
  bold?: boolean;
  size?: number;
  spacing?: boolean;
}): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    spacing: opts?.spacing !== false ? { after: 100 } : { after: 0 },
    children: [
      new TextRun({
        text,
        font: FONT,
        bold: opts?.bold ?? false,
        size: opts?.size ?? SIZE,
        rightToLeft: RTL,
      }),
    ],
  });
}

function sectionHeading(num: number, title: string): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 220, after: 100 },
    children: [
      new TextRun({
        text: `${num}. ${title}`,
        font: FONT,
        bold: true,
        size: SIZE,
        rightToLeft: RTL,
      }),
    ],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ bidirectional: RTL, spacing: { after: 80 }, children: [] });
}

/** Split multiline text into paragraphs, preserving empty lines */
function multilineParagraphs(text: string): Paragraph[] {
  const lines = text.split("\n");
  if (lines.length === 0) return [rtlParagraph("")];
  return lines.map((line) =>
    new Paragraph({
      bidirectional: RTL,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: line || " ",
          font: FONT,
          size: SIZE,
          rightToLeft: RTL,
        }),
      ],
    })
  );
}

/** Convert ArrayBuffer + mime to a base64 data URL for HTML/PDF output */
function arrayBufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function generateReport(data: ReportData): Promise<void> {
  const subjectLine =
    data.reportType === "summary"
      ? `דו״ח סיכום טיפולי ק.ת ל${data.childName}`
      : `דו״ח בקשה להמשך טיפולי ק.ת ל${data.childName}`;

  const goalLines = data.goals
    .split("\n")
    .map((g) => g.trim())
    .filter(Boolean);

  // Build logo paragraph if buffer provided
  const logoParagraphs: Paragraph[] = [];
  if (data.logoArrayBuffer) {
    const logoSize = scaleToMaxWidth(180, 60, 180); // default assumed 180x60
    logoParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [
          new ImageRun({
            data: data.logoArrayBuffer,
            transformation: { width: logoSize.width, height: logoSize.height },
            type: mimeToImageType(data.logoMime ?? "image/png"),
          }),
        ],
      })
    );
  }

  // Build signature paragraphs if buffer provided
  const signatureParagraphs: Paragraph[] = [];
  if (data.signatureArrayBuffer) {
    const sigSize = scaleToMaxWidth(130, 60, 130); // default assumed 130x60
    signatureParagraphs.push(
      rtlParagraph("בכבוד רב,"),
      new Paragraph({
        bidirectional: RTL,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 0 },
        children: [
          new ImageRun({
            data: data.signatureArrayBuffer,
            transformation: { width: sigSize.width, height: sigSize.height },
            type: mimeToImageType(data.signatureMime ?? "image/png"),
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          // Logo (if present) — before לכבוד
          ...logoParagraphs,

          // Header block
          rtlParagraph(`לכבוד משפחת ${data.familyName}`),
          rtlParagraph(`הנדון: ${subjectLine}`, { bold: true }),
          emptyLine(),
          rtlParagraph(`שם הילד/ה: ${data.childName}`),
          rtlParagraph(`ת.ז.: ${data.idNumber}`),
          rtlParagraph(`תאריך לידה: ${data.dateOfBirth}`),
          rtlParagraph(`תאריכי טיפול: ${data.dateRange}`),
          rtlParagraph(`מס׳ טיפולים: ${data.treatmentCount}`),
          emptyLine(),

          // 1. רקע
          sectionHeading(1, "רקע"),
          ...multilineParagraphs(data.background),
          emptyLine(),

          // 2. מטרות הטיפול
          sectionHeading(2, "מטרות הטיפול"),
          ...(goalLines.length > 0
            ? goalLines.map((goal) =>
                new Paragraph({
                  bidirectional: RTL,
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: `• ${goal}`,
                      font: FONT,
                      size: SIZE,
                      rightToLeft: RTL,
                    }),
                  ],
                })
              )
            : [rtlParagraph("")]),
          emptyLine(),

          // 3. תיאור התקדמות
          sectionHeading(3, "תיאור התקדמות"),
          ...multilineParagraphs(data.progress),
          emptyLine(),

          // 4. סיכום
          sectionHeading(4, "סיכום"),
          ...multilineParagraphs(data.summary),
          emptyLine(),

          // Signature (if present) — after סיכום
          ...signatureParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filename =
    data.reportType === "summary"
      ? `סיכום_טיפולי_${data.childName}.docx`
      : `בקשה_להמשך_טיפול_${data.childName}.docx`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateReportPDF(data: ReportData): void {
  const subjectLine =
    data.reportType === "summary"
      ? `דו״ח סיכום טיפולי ק.ת ל${data.childName}`
      : `דו״ח בקשה להמשך טיפולי ק.ת ל${data.childName}`;

  const goalLines = data.goals
    .split("\n")
    .map((g) => g.trim())
    .filter(Boolean);

  const logoHtml = data.logoArrayBuffer && data.logoMime
    ? `<div style="text-align:center;margin-bottom:16px;">
        <img src="${arrayBufferToDataUrl(data.logoArrayBuffer, data.logoMime)}" style="max-width:180px;height:auto;" />
      </div>`
    : "";

  const signatureHtml = data.signatureArrayBuffer && data.signatureMime
    ? `<div style="text-align:right;margin-top:24px;">
        <p style="margin:0 0 4px 0;">בכבוד רב,</p>
        <img src="${arrayBufferToDataUrl(data.signatureArrayBuffer, data.signatureMime)}" style="max-width:130px;height:auto;" />
      </div>`
    : "";

  const goalsHtml =
    goalLines.length > 0
      ? goalLines.map((g) => `<p style="margin:2px 0;">• ${g}</p>`).join("")
      : "<p></p>";

  const multilineHtml = (text: string) =>
    text
      .split("\n")
      .map((line) => `<p style="margin:2px 0;">${line || "&nbsp;"}</p>`)
      .join("");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${subjectLine}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Assistant&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: Arial, 'Assistant', sans-serif;
      font-size: 11pt;
      direction: rtl;
      text-align: right;
      color: #000;
      margin: 0;
      padding: 0;
    }
    @page { margin: 2.5cm; }
    @media print {
      body { margin: 0; padding: 0; }
    }
    h4 { margin: 18px 0 6px 0; font-size: 11pt; }
    p { margin: 3px 0; }
    .header-block { margin-bottom: 16px; }
    .section { margin-bottom: 14px; }
  </style>
</head>
<body>
  ${logoHtml}

  <div class="header-block">
    <p>לכבוד משפחת ${data.familyName}</p>
    <p><strong>הנדון: ${subjectLine}</strong></p>
    <br/>
    <p>שם הילד/ה: ${data.childName}</p>
    <p>ת.ז.: ${data.idNumber}</p>
    <p>תאריך לידה: ${data.dateOfBirth}</p>
    <p>תאריכי טיפול: ${data.dateRange}</p>
    <p>מס׳ טיפולים: ${data.treatmentCount}</p>
  </div>

  <div class="section">
    <h4>1. רקע</h4>
    ${multilineHtml(data.background)}
  </div>

  <div class="section">
    <h4>2. מטרות הטיפול</h4>
    ${goalsHtml}
  </div>

  <div class="section">
    <h4>3. תיאור התקדמות</h4>
    ${multilineHtml(data.progress)}
  </div>

  <div class="section">
    <h4>4. סיכום</h4>
    ${multilineHtml(data.summary)}
  </div>

  ${signatureHtml}
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
