import { type HandwritingData, handwritingToDataUrl, isHandwritingEmpty } from "./handwriting";

export interface DiagnosticField {
  label: string;
  data: HandwritingData;
}

export interface DiagnosticFormData {
  childName: string;
  idNumber: string;
  dateOfBirth: string;
  assessmentDate: string;
  examiner: string;
  fields: DiagnosticField[];
}

/**
 * Build a printable diagnostic document: dry fields as text, handwriting fields
 * rasterized to crisp PNGs. Uses the window.print() pattern (same as reports) so
 * the user can "Save as PDF" with the patient name as the default filename.
 */
export function generateDiagnosticPdf(form: DiagnosticFormData): void {
  const sectionsHtml = form.fields
    .map((f) => {
      if (isHandwritingEmpty(f.data)) {
        return `<div class="section">
          <div class="section-title">${escapeHtml(f.label)}</div>
          <div class="empty-line"></div>
        </div>`;
      }
      const w = f.data.w || 600;
      const h = f.data.h || 180;
      const img = handwritingToDataUrl(f.data, w, h, { scale: 2, color: "#1f2937" });
      return `<div class="section">
        <div class="section-title">${escapeHtml(f.label)}</div>
        <img class="hw" src="${img}" style="aspect-ratio:${w} / ${h};" />
      </div>`;
    })
    .join("");

  const title = `אבחון_${form.childName || "ללא_שם"}`;

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, "Assistant", sans-serif;
      font-size: 11pt;
      direction: rtl;
      text-align: right;
      color: #111;
    }
    @page { margin: 2cm; }
    @media print { body { margin: 0; } .section { break-inside: avoid; } }
    h1 { font-size: 16pt; margin-bottom: 4px; }
    .subtitle { color: #555; font-size: 10pt; margin-bottom: 16px; }
    .header-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px;
      padding: 12px 0; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;
      margin-bottom: 18px;
    }
    .header-grid p { font-size: 10.5pt; }
    .header-grid strong { color: #333; }
    .section { margin-bottom: 18px; }
    .section-title { font-weight: bold; margin-bottom: 6px; font-size: 11.5pt; }
    img.hw { width: 100%; height: auto; border: 1px solid #eee; border-radius: 6px; background: #fff; }
    .empty-line { height: 60px; border: 1px dashed #e5e7eb; border-radius: 6px; }
  </style>
</head>
<body>
  <h1>דו״ח אבחון</h1>
  <p class="subtitle">קלינאית תקשורת</p>

  <div class="header-grid">
    <p><strong>שם:</strong> ${escapeHtml(form.childName)}</p>
    <p><strong>ת.ז.:</strong> ${escapeHtml(form.idNumber)}</p>
    <p><strong>תאריך לידה:</strong> ${escapeHtml(form.dateOfBirth)}</p>
    <p><strong>תאריך אבחון:</strong> ${escapeHtml(form.assessmentDate)}</p>
    <p><strong>מאבחנת:</strong> ${escapeHtml(form.examiner)}</p>
  </div>

  ${sectionsHtml}

  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { window.print(); }, 250);
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
