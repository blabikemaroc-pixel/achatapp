import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import { prisma } from "@/lib/db";

export type PoPdfData = {
  reference: string;
  createdAt: Date;
  orgName: string;
  org: {
    logo: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    ice: string | null;
    rc: string | null;
    if: string | null;
    tp: string | null;
  };
  supplier: {
    name: string;
    contactName: string | null;
    email: string;
    address: string | null;
    ice?: string | null;
    rc?: string | null;
    if?: string | null;
    tp?: string | null;
  };
  items: { name: string; quantity: number; unit: string; unitPrice: number }[];
  shippingCost: number;
  total: number;
  notes: string | null;
  paymentTerms: string | null;
  deliveryDays: number | null;
  printCount?: number;
  printedBy?: string | null;
};

// pdf-lib (WinAnsi) ne sait pas encoder hors Latin-1 : on nettoie.
function clean(value: string) {
  return value.replace(/[^\x00-\xFF]/g, "");
}

function frDate(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getFullYear()}`;
}

// @ts-expect-error — le paquet "written-number" ne fournit pas de types.
import writtenNumber from "written-number";

export async function generatePoPdf(po: PoPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0, 0, 0);
  const textGray = rgb(0.2, 0.2, 0.2);

  const left = 40;
  const right = 555; 
  let y = 800;

  const text = (
    s: string,
    x: number,
    yPos: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) =>
    page.drawText(clean(s), {
      x,
      y: yPos,
      size: opts.size ?? 10,
      font: opts.font ?? font,
      color: opts.color ?? black,
    });

  const rightText = (
    s: string,
    xRight: number,
    yPos: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const size = opts.size ?? 10;
    const f = opts.font ?? font;
    const w = f.widthOfTextAtSize(clean(s), size);
    text(s, xRight - w, yPos, opts);
  };

  const centerText = (
    s: string,
    yPos: number,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const size = opts.size ?? 10;
    const f = opts.font ?? font;
    const w = f.widthOfTextAtSize(clean(s), size);
    text(s, 595 / 2 - w / 2, yPos, opts);
  };

  // Chargement du Logo (stocké en base : po.org.logo = id du StoredFile).
  let logoImage = null;
  if (po.org.logo) {
    try {
      const stored = await prisma.storedFile.findUnique({
        where: { id: po.org.logo },
        select: { data: true, mimeType: true },
      });
      if (stored) {
        const logoBytes = new Uint8Array(stored.data);
        if (stored.mimeType === "image/png") {
          logoImage = await doc.embedPng(logoBytes);
        } else if (
          stored.mimeType === "image/jpeg" ||
          stored.mimeType === "image/jpg"
        ) {
          logoImage = await doc.embedJpg(logoBytes);
        }
      }
    } catch (e) {
      console.error("Failed to load logo", e);
    }
  }

  // --- TOP BLOCKS ---
  // Printed Info
  const nowStr = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Casablanca", day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const printedLine = `Imprimé, le: ${nowStr}`;
  const isOriginal = (po.printCount || 0) <= 1; 
  const printStatus = isOriginal ? "ORIGINAL" : "DUPLICATA";

  page.drawRectangle({
    x: left,
    y: 818,
    width: 250,
    height: 12,
    color: rgb(0.95, 0.95, 0.95),
  });
  text(printedLine, left + 2, 820, { size: 8 });
  rightText(printStatus, right - 130, 820, { size: 10, font: bold, color: isOriginal ? black : rgb(0.5, 0.5, 0.5) });
  
  // Left: Org Logo & Name
  let ly = y - 20; // Lower the logo to align with the title
  
  if (logoImage) {
    const dims = logoImage.scaleToFit(150, 50);
    page.drawImage(logoImage, {
      x: left,
      y: ly - dims.height,
      width: dims.width,
      height: dims.height,
    });
    ly -= (dims.height + 40); // Gap adjusted (was 60, lowered ly by 20)
  } else {
    text(po.orgName.toUpperCase(), left, ly, { size: 16, font: bold, color: rgb(0.2, 0.4, 0.6) });
    ly -= 60; // Gap adjusted (was 80, lowered ly by 20)
  }
  
  // Right: Title & Date & Supplier
  let ry = y - 40; // Lower the title by 30px
  
  text("Bon de Commande", right - 280, ry, { size: 20, font: bold });
  text(`n°${po.reference}`, right - 280, ry - 22, { size: 18, font: bold });
  ry -= 50; // Gap to Infos Commande (previously 80, now 50 so Infos Commande stays in place)

  const infoBoxX = right - 280;
  const infoBoxWidth = 280;
  const infoBoxTopY = ry + 3;

  // Gray background for "Infos Commande"
  page.drawRectangle({
    x: infoBoxX,
    y: ry - 15,
    width: infoBoxWidth,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
  });
  text("Infos Commande", infoBoxX + 5, ry - 11, { size: 12, font: bold });
  ry -= 30;

  const dateStr = frDate(po.createdAt);
  text("Date Commande", infoBoxX + 5, ry, { size: 11, font: bold });
  text(dateStr, infoBoxX + 110, ry, { size: 10, font: bold }); 
  ry -= 15;
  
  text("Société", infoBoxX + 5, ry, { size: 11, font: bold });
  text(po.orgName.toUpperCase(), infoBoxX + 110, ry, { size: 10 });
  ry -= 15;

  text("Adresse livraison", infoBoxX + 5, ry, { size: 11, font: bold });
  
  let deliveryRy = ry;
  if (po.org.city) { text(po.org.city.toUpperCase(), infoBoxX + 110, deliveryRy, { size: 10 }); deliveryRy -= 12; }
  if (po.org.address) { 
    // Truncate address if too long
    const addr = po.org.address.toUpperCase();
    text(addr.substring(0, 35), infoBoxX + 110, deliveryRy, { size: 10 }); 
    deliveryRy -= 12; 
  }

  // Draw border around the entire Info Commande box
  page.drawRectangle({
    x: infoBoxX,
    y: deliveryRy - 5,
    width: infoBoxWidth,
    height: infoBoxTopY - (deliveryRy - 5),
    borderColor: black,
    borderWidth: 1,
  });
  // Draw line separating gray header from content
  page.drawLine({ start: { x: infoBoxX, y: infoBoxTopY - 18 }, end: { x: right, y: infoBoxTopY - 18 }, thickness: 1, color: black });
  
  // Left: Supplier details (light font)
  text("Société", left, ly, { size: 10, font, color: textGray }); ly -= 12;
  text(po.supplier.name.toUpperCase(), left, ly, { size: 10, font }); ly -= 12;
  if (po.supplier.address) { text(po.supplier.address, left, ly, { size: 10, font }); ly -= 12; }
  
  const supIds = [];
  if (po.supplier.ice) supIds.push(`ICE: ${po.supplier.ice}`);
  if (po.supplier.rc) supIds.push(`RC: ${po.supplier.rc}`);
  if (supIds.length > 0) { text(supIds.join(" - "), left, ly, { size: 10, font }); ly -= 12; }

  y = Math.min(ly, deliveryRy - 5) - 60; // Big gap before table

  // --- TABLE SECTION ---
  page.drawRectangle({
    x: left,
    y: y - 12,
    width: right - left,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: black,
    borderWidth: 1,
  });
  text("Détails sur la Commande", left + 5, y - 8, { size: 12, font: bold });
  y -= 30;

  // Table Columns Setup
  const xPoste = left; // 40
  const xArticle = 90;
  const xQty = 330;
  const xPu = 410;
  const xMontant = 480;

  page.drawLine({ start: { x: left, y: y + 15 }, end: { x: right, y: y + 15 }, thickness: 1, color: black });
  
  // Vertical lines for headers
  page.drawLine({ start: { x: xArticle, y: y + 15 }, end: { x: xArticle, y: y - 5 }, thickness: 1, color: black });
  page.drawLine({ start: { x: xQty, y: y + 15 }, end: { x: xQty, y: y - 5 }, thickness: 1, color: black });
  page.drawLine({ start: { x: xPu, y: y + 15 }, end: { x: xPu, y: y - 5 }, thickness: 1, color: black });
  page.drawLine({ start: { x: xMontant, y: y + 15 }, end: { x: xMontant, y: y - 5 }, thickness: 1, color: black });

  text("Poste", xPoste + 10, y, { size: 11, font: bold });
  text("Article/Désignation", xArticle + 10, y, { size: 11, font: bold });
  text("Quantité", xQty + 10, y, { size: 11, font: bold });
  text("Prix HT", xPu + 10, y, { size: 11, font: bold });
  text("Montant", xMontant + 10, y, { size: 11, font: bold });

  page.drawLine({ start: { x: left, y: y - 5 }, end: { x: right, y: y - 5 }, thickness: 1, color: black });

  const tableTopY = y + 15;
  y -= 25;

  let posteIdx = 10;
  for (const it of po.items) {
    const lineTotal = it.unitPrice * it.quantity;
    
    text(posteIdx.toString(), xPoste + 15, y, { size: 10 });
    posteIdx += 10;

    text(it.name.substring(0, 15).toUpperCase(), xArticle + 5, y, { size: 10 });
    text(it.name, xArticle + 5, y - 12, { size: 10 });

    const qtyStr = `${it.quantity.toFixed(3)}   ${it.unit.toUpperCase()}`;
    text(qtyStr, xQty + 5, y, { size: 10 });

    rightText(it.unitPrice.toFixed(3).replace(".", ","), xPu + 65, y, { size: 10 });

    rightText(lineTotal.toFixed(2).replace(".", ","), right - 5, y, { size: 10 });

    y -= 40;
  }

  // Draw Vertical lines spanning the entire table body
  const tableBottomY = y + 10;
  page.drawLine({ start: { x: left, y: tableTopY }, end: { x: left, y: tableBottomY }, thickness: 1, color: black });
  page.drawLine({ start: { x: right, y: tableTopY }, end: { x: right, y: tableBottomY }, thickness: 1, color: black });
  
  page.drawLine({ start: { x: xArticle, y: tableTopY }, end: { x: xArticle, y: tableBottomY }, thickness: 1, color: black });
  page.drawLine({ start: { x: xQty, y: tableTopY }, end: { x: xQty, y: tableBottomY }, thickness: 1, color: black });
  page.drawLine({ start: { x: xPu, y: tableTopY }, end: { x: xPu, y: tableBottomY }, thickness: 1, color: black });
  page.drawLine({ start: { x: xMontant, y: tableTopY }, end: { x: xMontant, y: tableBottomY }, thickness: 1, color: black });

  // Draw table bottom border
  page.drawLine({ start: { x: left, y: tableBottomY }, end: { x: right, y: tableBottomY }, thickness: 1, color: black });
  
  // --- FOOTER BLOCK ---
  // Anchor to the bottom to match the original template spacing
  y = Math.min(y - 40, 250);

  text("Total HT :", right - 220, y, { size: 14, font: bold });
  rightText(`${po.total.toFixed(2).replace(".", ",")}   MAD`, right - 40, y, { size: 10 });
  y -= 25;

  page.drawRectangle({
    x: left,
    y: y - 5,
    width: right - left,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: black,
    borderWidth: 1,
  });
  text("LE PRESENT BON DE COMMANDE EST ARRETE A LA SOMME DE", left + 5, y - 1, { size: 11, font: bold });
  y -= 15;

  const amountInt = Math.floor(po.total);
  const amountDec = Math.round((po.total - amountInt) * 100);
  let amountStr = writtenNumber(amountInt, { lang: "fr" });
  if (amountDec > 0) {
    amountStr += ` ET ${writtenNumber(amountDec, { lang: "fr" })} CENTIMES`;
  } else {
    amountStr += " ET ZERO CENTIMES";
  }
  amountStr = amountStr.toUpperCase() + " MAD"; // Changed to MAD
  
  text(amountStr, left + 5, y, { size: 10, font });
  y -= 25;

  // Signature box
  page.drawRectangle({
    x: right - 250,
    y: y - 15,
    width: 250,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: black,
    borderWidth: 1,
  });
  text("Signature", right - 245, y - 11, { size: 12, font: bold });

  y -= 50;

  // --- FOOTER (Pied de page) ---
  const footerY = 50;
  page.drawLine({ start: { x: left, y: footerY }, end: { x: right, y: footerY }, thickness: 1, color: black });
  
  const foot1 = [];
  if (po.org.address) foot1.push(po.org.address);
  if (po.org.city) foot1.push(po.org.city);
  if (foot1.length > 0) {
    centerText(foot1.join(" - "), footerY - 15, { size: 9, font: bold, color: textGray });
  }

  const foot2 = [];
  if (po.org.ice) foot2.push(`ICE : ${po.org.ice}`);
  if (po.org.if) foot2.push(`IF : ${po.org.if}`);
  if (po.org.rc) foot2.push(`RC : ${po.org.rc}`);
  if (po.org.phone) foot2.push(`Tél : ${po.org.phone}`);
  if (po.org.email) foot2.push(`Email : ${po.org.email}`);
  
  if (foot2.length > 0) {
    centerText(foot2.join(" | "), footerY - 28, { size: 9, font: bold, color: textGray });
  }

  return doc.save();
}

// Charge les données d'un bon de commande (vérifié org) pour le PDF.
export async function loadPoPdfData(
  poId: string,
  orgId: string,
): Promise<PoPdfData | null> {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, orgId },
    include: {
      supplier: true,
      org: { 
        select: { 
          name: true,
          logo: true,
          address: true,
          city: true,
          phone: true,
          email: true,
          ice: true,
          rc: true,
          if: true,
          tp: true
        } 
      },
      items: { include: { product: { select: { name: true, unit: true } } } },
    },
  });
  if (!po) return null;

  let shippingCost = 0;
  let paymentTerms: string | null = null;
  let deliveryDays: number | null = null;
  if (po.quoteId) {
    const q = await prisma.quote.findUnique({
      where: { id: po.quoteId },
      select: { shippingCost: true, paymentTerms: true, deliveryDays: true },
    });
    if (q) {
      shippingCost = q.shippingCost ?? 0;
      paymentTerms = q.paymentTerms;
      deliveryDays = q.deliveryDays;
    }
  }

  return {
    reference: po.reference,
    createdAt: po.createdAt,
    orgName: po.org.name,
    org: {
      logo: po.org.logo,
      address: po.org.address,
      city: po.org.city,
      phone: po.org.phone,
      email: po.org.email,
      ice: po.org.ice,
      rc: po.org.rc,
      if: po.org.if,
      tp: po.org.tp,
    },
    supplier: {
      name: po.supplier.name,
      contactName: po.supplier.contactName,
      email: po.supplier.email,
      address: po.supplier.address,
      ice: po.supplier.ice,
      rc: po.supplier.rc,
      if: po.supplier.if,
      tp: po.supplier.tp,
    },
    items: po.items.map((i) => ({
      name: i.product.name,
      quantity: i.quantity,
      unit: i.product.unit,
      unitPrice: i.unitPrice,
    })),
    shippingCost,
    total: po.total,
    notes: po.notes,
    paymentTerms,
    deliveryDays,
    printCount: po.printCount,
  };
}
