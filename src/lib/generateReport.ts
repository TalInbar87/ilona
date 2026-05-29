import {
  Document, Packer, Paragraph, TextRun,
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
}

const FONT = "Arial";
const RTL = true;

function rtlParagraph(text: string, opts?: {
  bold?: boolean;
  size?: number;       // half-points (24 = 12pt)
  heading?: boolean;
  spacing?: boolean;
}): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    spacing: opts?.spacing !== false ? { after: 120 } : { after: 0 },
    children: [
      new TextRun({
        text,
        font: FONT,
        bold: opts?.bold ?? false,
        size: opts?.size ?? 24,          // 12pt default
        rightToLeft: RTL,
      }),
    ],
  });
}

function sectionHeading(num: number, title: string): Paragraph {
  return new Paragraph({
    bidirectional: RTL,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: `${num}. ${title}`,
        font: FONT,
        bold: true,
        size: 26,          // 13pt
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
          size: 24,
          rightToLeft: RTL,
        }),
      ],
    })
  );
}

export async function generateReport(data: ReportData): Promise<void> {
  const subjectLine =
    data.reportType === "summary"
      ? `דוח סיכום טיפול ק.ת ל-${data.childName}`
      : `בקשה להמשך טיפול ק.ת ל-${data.childName}`;

  const goalLines = data.goals
    .split("\n")
    .map((g) => g.trim())
    .filter(Boolean);

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
          // Header block
          rtlParagraph(`לכבוד משפחת ${data.familyName}`, { bold: true, size: 26 }),
          rtlParagraph(`הנדון: ${subjectLine}`, { bold: true, size: 26 }),
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
                      size: 24,
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
      ? `סיכום_טיפול_${data.childName}.docx`
      : `בקשה_להמשך_טיפול_${data.childName}.docx`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
