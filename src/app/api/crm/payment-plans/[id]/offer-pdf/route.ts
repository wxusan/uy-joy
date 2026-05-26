import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealVisibilityWhere, generatePaymentSchedule } from "@/lib/real-estate";
import { requirePlatformApiFeature } from "@/lib/platform-guards";
import { getPlatformSettings } from "@/lib/platform-settings";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: number, currency: string) {
  return `${Math.round(value).toLocaleString("uz-UZ")} ${currency}`;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

async function launchPdfBrowser() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return puppeteer.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

async function makePaymentOfferPdfDataUri(input: {
  brandName: string;
  logoUrl: string | null;
  dealNumber: string;
  clientName: string;
  clientPhone: string;
  managerName: string;
  projectName: string;
  unitLabel: string;
  planName: string;
  planType: string;
  totalAmount: number;
  initialPaymentAmount: number;
  remainingAmount: number;
  termMonths: number;
  currency: string;
  startsAt: Date | null;
  rows: Array<{ sequence: number; label: string; dueDate: Date | string; expectedAmount: number; currency?: string | null }>;
}) {
  const typeLabel = input.planType === "cash" ? "Naqd to'lov" : "Bo'lib to'lash";
  const logo = input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" />` : `<div class="brand">${escapeHtml(input.brandName)}</div>`;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, "Helvetica Neue", sans-serif; color: #111827; margin: 0; padding: 38px; }
      .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; border-bottom: 2px solid #111827; padding-bottom: 18px; margin-bottom: 24px; }
      .logo { max-height: 54px; max-width: 180px; object-fit: contain; }
      .brand { font-weight: 800; font-size: 24px; }
      h1 { font-size: 26px; margin: 0 0 6px; }
      .muted { color: #6b7280; }
      .badge { display: inline-block; background: #e8f3ee; color: #0f5132; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 700; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
      .box { border: 1px solid #d7dee8; border-radius: 10px; padding: 14px; }
      .box h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; margin: 0 0 10px; color: #374151; }
      .kv { display: grid; grid-template-columns: 160px 1fr; gap: 8px; font-size: 13px; margin: 7px 0; }
      .kv span:first-child { color: #6b7280; }
      table { border-collapse: collapse; width: 100%; margin-top: 14px; font-size: 12.5px; }
      th { background: #eef4f8; color: #1f2937; text-align: left; padding: 9px; border: 1px solid #d7dee8; }
      td { padding: 9px; border: 1px solid #d7dee8; }
      td.num { text-align: right; white-space: nowrap; }
      .summary { background: #fff7dc; border-color: #ead18a; }
      .footer { margin-top: 26px; color: #6b7280; font-size: 11px; line-height: 1.45; }
    </style>
  </head>
  <body>
    <div class="top">
      <div>
        <h1>To'lov rejasi taklifi</h1>
        <div class="muted">Bitim: ${escapeHtml(input.dealNumber)} · ${escapeHtml(formatDate(new Date()))}</div>
      </div>
      ${logo}
    </div>
    <span class="badge">${escapeHtml(typeLabel)}</span>
    <div class="grid">
      <div class="box">
        <h2>Klient</h2>
        <div class="kv"><span>Ism</span><strong>${escapeHtml(input.clientName)}</strong></div>
        <div class="kv"><span>Telefon</span><strong>${escapeHtml(input.clientPhone)}</strong></div>
        <div class="kv"><span>Menejer</span><strong>${escapeHtml(input.managerName)}</strong></div>
      </div>
      <div class="box">
        <h2>Xonadon</h2>
        <div class="kv"><span>Loyiha</span><strong>${escapeHtml(input.projectName)}</strong></div>
        <div class="kv"><span>Xonadon</span><strong>${escapeHtml(input.unitLabel)}</strong></div>
        <div class="kv"><span>Reja nomi</span><strong>${escapeHtml(input.planName)}</strong></div>
      </div>
    </div>
    <div class="box summary">
      <h2>Kelishilgan shartlar</h2>
      <div class="kv"><span>Umumiy narx</span><strong>${escapeHtml(formatMoney(input.totalAmount, input.currency))}</strong></div>
      <div class="kv"><span>Boshlang'ich to'lov</span><strong>${escapeHtml(formatMoney(input.initialPaymentAmount, input.currency))}</strong></div>
      <div class="kv"><span>Qoldiq</span><strong>${escapeHtml(formatMoney(input.remainingAmount, input.currency))}</strong></div>
      <div class="kv"><span>Muddat</span><strong>${escapeHtml(input.termMonths ? `${input.termMonths} oy` : "Naqd / to'liq to'lov")}</strong></div>
      <div class="kv"><span>Boshlanish sanasi</span><strong>${escapeHtml(formatDate(input.startsAt))}</strong></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>To'lov</th><th>Sana</th><th>Summa</th></tr></thead>
      <tbody>
        ${input.rows
          .map((row) => `<tr><td>${escapeHtml(row.sequence)}</td><td>${escapeHtml(row.label)}</td><td>${escapeHtml(formatDate(row.dueDate))}</td><td class="num">${escapeHtml(formatMoney(row.expectedAmount, row.currency || input.currency))}</td></tr>`)
          .join("")}
      </tbody>
    </table>
    <div class="footer">
      Ushbu hujjat mijoz bilan kelishilgan to'lov shartlarini ulashish uchun tayyorlandi. Yakuniy shartnoma, bron va to'lovlar kompaniya tomonidan tasdiqlangan hujjatlar asosida rasmiylashtiriladi.
      <br />${escapeHtml(input.brandName)} CRM orqali yaratildi.
    </div>
  </body>
</html>`;
  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const pdfBytes = await page.pdf({ format: "A4", printBackground: true });
    return `data:application/pdf;base64,${Buffer.from(pdfBytes).toString("base64")}`;
  } finally {
    await browser.close();
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformApiFeature("documents", "viewDeals");
  if (auth.response) return auth.response;
  const { id } = await params;
  const plan = await prisma.paymentPlan.findUnique({
    where: { id },
    include: {
      payments: { orderBy: { sequence: "asc" } },
      deal: {
        include: {
          client: true,
          assignedTo: true,
          primaryUnit: { include: { floor: { include: { building: { include: { project: true } } } } } },
        },
      },
    },
  });
  if (!plan || !(await prisma.deal.findFirst({ where: { AND: [{ id: plan.dealId }, dealVisibilityWhere(auth.user)] } }))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deal = plan.deal;
  const unit = deal.primaryUnit;
  const settings = getPlatformSettings();
  const customSchedule = Array.isArray(plan.scheduleJson)
    ? (plan.scheduleJson as Parameters<typeof generatePaymentSchedule>[0]["customSchedule"])
    : undefined;
  const generatedRows = generatePaymentSchedule({
    salePrice: plan.totalAmount,
    initialPaymentAmount: plan.initialPaymentAmount,
    remainingAmount: plan.remainingAmount,
    termMonths: plan.termMonths,
    startsAt: plan.startsAt || new Date(),
    currency: deal.currency,
    customSchedule,
  });
  const rows = plan.payments.length
    ? plan.payments.map((payment) => ({
        sequence: payment.sequence,
        label: payment.label,
        dueDate: payment.dueDate,
        expectedAmount: payment.expectedAmount,
        currency: deal.currency,
      }))
    : generatedRows;

  const pdfDataUri = await makePaymentOfferPdfDataUri({
    brandName: settings.publicBrandName,
    logoUrl: settings.branding.logoUrl,
    dealNumber: deal.dealNumber,
    clientName: deal.client.fullName,
    clientPhone: deal.client.phone,
    managerName: deal.assignedTo?.name || "-",
    projectName: unit?.floor.building.project.name || "-",
    unitLabel: unit ? `${unit.floor.building.name}, ${unit.floor.number}-qavat, ${unit.unitNumber}` : "Biriktirilmagan",
    planName: plan.name,
    planType: plan.type,
    totalAmount: plan.totalAmount,
    initialPaymentAmount: plan.initialPaymentAmount,
    remainingAmount: plan.remainingAmount,
    termMonths: plan.termMonths,
    currency: deal.currency,
    startsAt: plan.startsAt,
    rows,
  });
  const upload = await cloudinary.uploader.upload(pdfDataUri, {
    folder: "uy-joy/documents/generated",
    public_id: `${deal.dealNumber.replace(/[^a-zA-Z0-9_-]/g, "")}-payment-offer-${Date.now()}`,
    resource_type: "auto",
  });
  const document = await prisma.document.create({
    data: {
      clientId: deal.clientId,
      leadId: deal.leadId,
      dealId: deal.id,
      unitId: deal.primaryUnitId,
      uploadedById: auth.user?.id || null,
      type: "other",
      title: `To'lov rejasi taklifi ${deal.dealNumber}`,
      fileUrl: upload.secure_url,
      fileName: `${deal.dealNumber}-payment-offer.pdf`,
      mimeType: "application/pdf",
      status: "uploaded",
    },
  });
  await createActivity({
    type: "document",
    title: "To'lov rejasi PDF yaratildi",
    clientId: deal.clientId,
    leadId: deal.leadId,
    dealId: deal.id,
    unitId: deal.primaryUnitId,
    actorId: auth.user?.id || null,
    metadata: { documentId: document.id, paymentPlanId: plan.id },
  });
  return NextResponse.json(document, { status: 201 });
}
