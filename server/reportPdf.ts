import PDFDocument from "pdfkit";
import { calculateMonthlySummary, formatCurrency, type FinancialEntry } from "./financialCalculations";

export type ReportPdfInput = {
  clientName: string;
  businessName?: string | null;
  month: number;
  year: number;
  reportType: "dre" | "fluxo_caixa";
  transactions: FinancialEntry[];
};

function drawHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  doc.rect(0, 0, 595, 86).fill("#0f2747");
  doc.fillColor("#ffffff").fontSize(22).font("Helvetica-Bold").text("AION", 42, 24);
  doc.fontSize(9).font("Helvetica").fillColor("#b9c8dc").text("GESTÃO FINANCEIRA CONSULTIVA", 43, 51);
  doc.fillColor("#ffffff").fontSize(15).font("Helvetica-Bold").text(title, 325, 25, { width: 220, align: "right" });
  doc.fontSize(9).font("Helvetica").fillColor("#b9c8dc").text(subtitle, 325, 49, { width: 220, align: "right" });
  doc.fillColor("#1f2937");
}

function drawMetric(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, tone: string) {
  doc.roundedRect(x, y, 155, 62, 7).fill("#f5f7fb");
  doc.rect(x, y, 4, 62).fill(tone);
  doc.fillColor("#64748b").fontSize(8).font("Helvetica-Bold").text(label.toUpperCase(), x + 14, y + 13);
  doc.fillColor("#0f172a").fontSize(15).font("Helvetica-Bold").text(value, x + 14, y + 31);
}

function drawTable(doc: PDFKit.PDFDocument, title: string, rows: Array<{ category: string; amount: number }>, y: number) {
  doc.fillColor("#0f2747").fontSize(11).font("Helvetica-Bold").text(title, 42, y);
  let cursor = y + 25;
  doc.roundedRect(42, cursor, 511, 22, 4).fill("#e9eef6");
  doc.fillColor("#475569").fontSize(8).font("Helvetica-Bold").text("CATEGORIA", 55, cursor + 7);
  doc.text("VALOR", 440, cursor + 7, { width: 98, align: "right" });
  cursor += 22;
  rows.slice(0, 8).forEach((row, index) => {
    if (index % 2 === 0) doc.rect(42, cursor, 511, 22).fill("#fbfcfe");
    doc.fillColor("#334155").fontSize(9).font("Helvetica").text(row.category, 55, cursor + 7, { width: 340 });
    doc.fillColor("#0f172a").font("Helvetica-Bold").text(formatCurrency(row.amount), 440, cursor + 7, { width: 98, align: "right" });
    cursor += 22;
  });
  return cursor;
}

export async function buildFinancialReportPdf(input: ReportPdfInput): Promise<Buffer> {
  const summary = calculateMonthlySummary(input.transactions);
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(input.year, input.month - 1, 1));
  const title = input.reportType === "dre" ? "DRE SIMPLIFICADO" : "FLUXO DE CAIXA";
  const subtitle = `${monthLabel} · ${input.clientName}`;
  const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: `${title} — ${input.clientName}`, Author: "Aion Finance" } });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawHeader(doc, title, subtitle);
  doc.y = 112;
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text(input.businessName || input.clientName);
  doc.fillColor("#64748b").font("Helvetica").fontSize(9).text("Relatório preparado pelo Consultor Aion · Documento gerencial");

  drawMetric(doc, 42, 160, "Receitas", formatCurrency(summary.totalIncome), "#0f766e");
  drawMetric(doc, 213, 160, "Despesas", formatCurrency(summary.totalExpense), "#c2410c");
  drawMetric(doc, 384, 160, "Resultado", formatCurrency(summary.netCashFlow), summary.netCashFlow >= 0 ? "#2563eb" : "#b91c1c");
  drawMetric(doc, 42, 235, "Margem", `${summary.grossMargin.toFixed(1)}%`, "#7c3aed");
  drawMetric(doc, 213, 235, "Ponto de equilíbrio", formatCurrency(summary.breakEvenPoint), "#0891b2");
  drawMetric(doc, 384, 235, "Lançamentos", String(input.transactions.length), "#475569");

  doc.fillColor("#0f2747").fontSize(11).font("Helvetica-Bold").text("Leitura executiva", 42, 325);
  const interpretation = summary.netCashFlow >= 0
    ? `O período encerrou com geração de caixa de ${formatCurrency(summary.netCashFlow)} e margem de ${summary.grossMargin.toFixed(1)}%.`
    : `O período encerrou com consumo de caixa de ${formatCurrency(Math.abs(summary.netCashFlow))}. Recomenda-se revisar despesas e recebimentos.`;
  doc.fillColor("#475569").fontSize(10).font("Helvetica").text(interpretation, 42, 347, { width: 511, lineGap: 4 });

  let tableY = 395;
  if (input.reportType === "dre") {
    tableY = drawTable(doc, "Composição das receitas", summary.incomeByCategory, tableY);
    tableY += 30;
    drawTable(doc, "Composição das despesas", summary.expenseByCategory, tableY);
  } else {
    drawTable(doc, "Entradas por categoria", summary.incomeByCategory, tableY);
    tableY += 220;
    drawTable(doc, "Saídas por categoria", summary.expenseByCategory, tableY);
  }

  doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text("AION Finance · Uso gerencial · Valores em reais · Dados fornecidos pelo cliente", 42, 785, { width: 511, align: "center" });
  doc.end();
  return done;
}
