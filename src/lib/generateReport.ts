import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, convertInchesToTwip,
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
  logoMime?: string;
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
  return "png";
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

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 220, after: 100 },
    children: [
      new TextRun({
        text: title,
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

  // Logo paragraph
  const logoParagraphs: Paragraph[] = [];
  if (data.logoArrayBuffer) {
    const logoSize = scaleToMaxWidth(180, 60, 180);
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

  // Signature paragraphs
  const signatureParagraphs: Paragraph[] = [];
  if (data.signatureArrayBuffer) {
    const sigSize = scaleToMaxWidth(130, 60, 130);
    signatureParagraphs.push(
      rtlParagraph("בברכה,"),
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
          ...logoParagraphs,

          rtlParagraph(`לכבוד משפחת ${data.familyName}`),
          rtlParagraph(`הנדון: ${subjectLine}`, { bold: true }),
          emptyLine(),
          rtlParagraph(`שם הילד/ה: ${data.childName}`),
          rtlParagraph(`ת.ז.: ${data.idNumber}`),
          rtlParagraph(`תאריך לידה: ${data.dateOfBirth}`),
          rtlParagraph(`תאריכי טיפול: ${data.dateRange}`),
          rtlParagraph(`מס׳ טיפולים: ${data.treatmentCount}`),
          emptyLine(),

          sectionHeading("רקע"),
          ...multilineParagraphs(data.background),
          emptyLine(),

          sectionHeading("מטרות"),
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

          sectionHeading("תיאור התקדמות"),
          ...multilineParagraphs(data.progress),
          emptyLine(),

          sectionHeading("סיכום"),
          ...multilineParagraphs(data.summary),
          emptyLine(),

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
    ? `<div class="logo-block">
        <img src="${arrayBufferToDataUrl(data.logoArrayBuffer, data.logoMime)}" style="max-width:180px;height:auto;" />
      </div>`
    : "";

  const signatureHtml = data.signatureArrayBuffer && data.signatureMime
    ? `<div class="signature-block">
        <p>בברכה,</p>
        <img src="${arrayBufferToDataUrl(data.signatureArrayBuffer, data.signatureMime)}" style="max-width:130px;height:auto;" />
      </div>`
    : "";

  const goalsHtml =
    goalLines.length > 0
      ? goalLines.map((g) => `<p>• ${g}</p>`).join("")
      : "<p></p>";

  const multilineHtml = (text: string) =>
    text
      .split("\n")
      .map((line) => `<p>${line || "&nbsp;"}</p>`)
      .join("");

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${subjectLine}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      direction: rtl;
      text-align: right;
      color: #000;
    }
    @page { margin: 2.5cm; }
    @media print { body { margin: 0; } }
    p { margin: 3px 0; line-height: 1.5; }
    .logo-block { text-align: center; margin-bottom: 20px; }
    .header-block { margin-bottom: 18px; }
    .header-block p { margin: 2px 0; }
    .section { margin-bottom: 16px; }
    .section-title { font-weight: bold; margin-bottom: 6px; margin-top: 18px; }
    .signature-block { margin-top: 30px; }
    .signature-block p { margin-bottom: 4px; }
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
    <div class="section-title">רקע</div>
    ${multilineHtml(data.background)}
  </div>

  <div class="section">
    <div class="section-title">מטרות</div>
    ${goalsHtml}
  </div>

  <div class="section">
    <div class="section-title">תיאור התקדמות</div>
    ${multilineHtml(data.progress)}
  </div>

  <div class="section">
    <div class="section-title">סיכום</div>
    ${multilineHtml(data.summary)}
  </div>

  ${signatureHtml}

  <script>
    // Wait for all images to load before printing
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
}
