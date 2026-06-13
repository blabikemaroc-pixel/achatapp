import "server-only";
import nodemailer from "nodemailer";

import { APP_LOCALE } from "@/lib/config";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "Achats <noreply@procurement.local>",
    ...opts,
  });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

export function rfqEmailTemplate(params: {
  orgName: string;
  supplierName: string;
  reference: string;
  dueDate: Date | null;
  items: { name: string; quantity: number; unit: string }[];
  link: string;
}) {
  const { orgName, supplierName, reference, dueDate, items, link } = params;
  const due = dueDate
    ? new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: "long" }).format(dueDate)
    : null;

  const rowsHtml = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #e2e8f0">${escapeHtml(
          i.name,
        )}</td><td style="padding:6px 0;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap"><strong>${
          i.quantity
        } ${escapeHtml(i.unit)}</strong></td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0f172a;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">${escapeHtml(
      orgName,
    )}</div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
      <p>Bonjour ${escapeHtml(supplierName)},</p>
      <p><strong>${escapeHtml(
        orgName,
      )}</strong> souhaite recevoir votre devis (référence <strong>${escapeHtml(
        reference,
      )}</strong>) pour les produits suivants :</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${rowsHtml}</table>
      ${
        due
          ? `<p style="color:#475569">Réponse souhaitée avant le <strong>${due}</strong>.</p>`
          : ""
      }
      <p style="margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#0369a1;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Saisir mon devis</a>
      </p>
      <p style="color:#64748b;font-size:13px">Ou copiez ce lien : <br>${escapeHtml(
        link,
      )}</p>
    </div>
  </div></body></html>`;

  const text = `Bonjour ${supplierName},

${orgName} souhaite recevoir votre devis (réf. ${reference}) pour :
${items.map((i) => `- ${i.name} : ${i.quantity} ${i.unit}`).join("\n")}
${due ? `\nRéponse souhaitée avant le ${due}.\n` : ""}
Saisir votre devis : ${link}
`;

  return { subject: `Demande de prix ${reference} — ${orgName}`, html, text };
}
