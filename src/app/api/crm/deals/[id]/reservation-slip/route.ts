import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import prisma from "@/lib/prisma";
import { createActivity } from "@/lib/crm";
import { dealVisibilityWhere } from "@/lib/real-estate";
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

function absoluteAssetUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.NEXTAUTH_URL || process.env.CLIENT_PUBLIC_DOMAIN;
  if (!base) return value;
  return `${base.replace(/\/$/, "")}/${value.replace(/^\//, "")}`;
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

async function makeReservationSlipPdfDataUri(input: {
  brandName: string;
  logoUrl?: string | null;
  dealNumber: string;
  clientName: string;
  clientPhone: string;
  unitLabel: string;
  areaRooms: string;
  reservedAt: string;
  expiresAt: string;
  listPrice: string;
  salePrice: string;
  initialPayment: string;
  salesAgent: string;
  project: string;
}) {
  const rows = [
    ["Bron raqami", input.dealNumber],
    ["Klient", `${input.clientName} ${input.clientPhone}`],
    ["Xonadon", input.unitLabel],
    ["Maydon / xona", input.areaRooms],
    ["Bron ochildi", input.reservedAt],
    ["Bron tugaydi", input.expiresAt],
    ["Boshlang'ich narx", input.listPrice],
    ["Kelishilgan narx", input.salePrice],
    ["Boshlang'ich to'lov", input.initialPayment],
    ["Mas'ul menejer", input.salesAgent],
    ["Loyiha", input.project],
  ];
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Arial, "Helvetica Neue", sans-serif; color: #15120f; margin: 0; padding: 40px; }
      .head { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
      .logo { max-width: 140px; max-height: 56px; object-fit: contain; }
      h1 { font-size: 26px; margin: 0 0 8px; }
      .sub { color: #6f665c; margin-bottom: 28px; }
      table { border-collapse: collapse; width: 100%; font-size: 13px; }
      td { border-bottom: 1px solid #e7dfd4; padding: 11px 0; vertical-align: top; }
      td:first-child { color: #6f665c; width: 180px; }
      .note { margin-top: 24px; border: 1px solid #e7dfd4; border-radius: 10px; padding: 14px; background: #fbf7f1; font-size: 13px; }
      .footer { margin-top: 32px; color: #6f665c; font-size: 11px; }
    </style>
  </head>
  <body>
    <div class="head">
      <div>
        <h1>Bron hujjati</h1>
        <div class="sub">${escapeHtml(input.project)}</div>
      </div>
      ${input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" />` : `<strong>${escapeHtml(input.brandName)}</strong>`}
    </div>
    <table>
      <tbody>
        ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}
      </tbody>
    </table>
    <div class="note">Ushbu hujjat xonadon vaqtincha bron qilinganini tasdiqlaydi. Bron muddati tugaguncha shartlar savdo bo'limi bilan kelishiladi.</div>
    <div class="footer">${escapeHtml(input.brandName)} CRM orqali yaratildi.</div>
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
  const deal = await prisma.deal.findFirst({
    where: { AND: [{ id }, dealVisibilityWhere(auth.user)] },
    include: {
      client: true,
      primaryUnit: { include: { floor: { include: { building: { include: { project: true } } } } } },
      assignedTo: true,
    },
  });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const unit = deal.primaryUnit;
  const settings = getPlatformSettings();
  const pdfDataUri = await makeReservationSlipPdfDataUri({
    brandName: settings.publicBrandName,
    logoUrl: absoluteAssetUrl(settings.branding.logoUrl),
    dealNumber: deal.dealNumber,
    clientName: deal.client.fullName,
    clientPhone: deal.client.phone,
    unitLabel: unit ? `${unit.floor.building.name}, ${unit.floor.number}-qavat, №${unit.unitNumber}` : "Draft",
    areaRooms: unit ? `${unit.area} m2 / ${unit.rooms} xona` : "-",
    reservedAt: deal.reservedAt?.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }) || "-",
    expiresAt: deal.reservationExpiresAt?.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }) || "-",
    listPrice: `${deal.listPrice} ${deal.currency}`,
    salePrice: `${deal.salePrice} ${deal.currency}`,
    initialPayment: `${deal.initialPaymentAmount} ${deal.currency}`,
    salesAgent: deal.assignedTo?.name || "-",
    project: unit?.floor.building.project.name || "-",
  });
  const upload = await cloudinary.uploader.upload(pdfDataUri, {
    folder: "uy-joy/documents/generated",
    public_id: `${deal.dealNumber.replace(/[^a-zA-Z0-9_-]/g, "")}-reservation-slip-${Date.now()}`,
    resource_type: "auto",
  });
  const document = await prisma.document.create({
    data: {
      clientId: deal.clientId,
      leadId: deal.leadId,
      dealId: deal.id,
      unitId: deal.primaryUnitId,
      uploadedById: auth.user?.id || null,
      type: "reservation_agreement",
      title: `Reservation slip ${deal.dealNumber}`,
      fileUrl: upload.secure_url,
      fileName: `${deal.dealNumber}-reservation-slip.pdf`,
      mimeType: "application/pdf",
      status: "uploaded",
    },
  });
  await createActivity({
    type: "document",
    title: "Bron hujjati yaratildi",
    clientId: deal.clientId,
    leadId: deal.leadId,
    dealId: deal.id,
    unitId: deal.primaryUnitId,
    actorId: auth.user?.id || null,
    metadata: { documentId: document.id },
  });
  return NextResponse.json(document, { status: 201 });
}
