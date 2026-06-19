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
  attachments?: { filename: string; content: Buffer }[];
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
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#0f172a;color:#fff;padding:24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold;text-align:center;">
      ${escapeHtml(orgName)} - Demande de Devis
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;font-size:15px;line-height:1.6;">
      <p>Monsieur le Directeur de la Société <strong>${escapeHtml(supplierName)}</strong>,</p>
      <p>Nous avons l'honneur de vous adresser la présente afin de solliciter votre meilleure offre tarifaire pour les prestations ci-dessous (Réf : <strong>${escapeHtml(reference)}</strong>) :</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0">${rowsHtml}</table>
      ${
        due
          ? `<p style="color:#b91c1c;font-weight:bold;">Veuillez noter que votre retour est attendu au plus tard le ${due}.</p>`
          : ""
      }
      <p style="margin:32px 0;text-align:center;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;">Accéder au formulaire de réponse</a>
      </p>
      <p>Dans l'attente de votre proposition, nous vous prions d'agréer, Monsieur le Directeur, l'expression de nos salutations distinguées.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
      <p style="color:#64748b;font-size:13px;text-align:center;">
        En cas de difficulté avec le bouton ci-dessus, vous pouvez copier/coller ce lien sécurisé :<br>
        <a href="${link}" style="color:#2563eb;word-break:break-all;">${escapeHtml(link)}</a>
      </p>
    </div>
  </div></body></html>`;

  const text = `Monsieur le Directeur de la Société ${supplierName},

Nous avons l'honneur de vous solliciter pour une demande de devis (Réf : ${reference}) concernant les prestations suivantes :
${items.map((i) => `- ${i.name} : ${i.quantity} ${i.unit}`).join("\n")}
${due ? `\nVotre retour est attendu au plus tard le ${due}.\n` : ""}
Veuillez cliquer sur le lien sécurisé suivant pour soumettre votre offre :
${link}

Dans l'attente de votre proposition, nous vous prions d'agréer l'expression de nos salutations distinguées.
`;

  return { subject: `Demande de prix ${reference} — ${orgName}`, html, text };
}

export function poEmailTemplate(params: {
  orgName: string;
  supplierName: string;
  reference: string;
  total: string;
}) {
  const { orgName, supplierName, reference, total } = params;

  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#0f172a;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:bold">${escapeHtml(
      orgName,
    )}</div>
    <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
      <p>Bonjour ${escapeHtml(supplierName)},</p>
      <p>Veuillez trouver ci-joint notre bon de commande <strong>${escapeHtml(
        reference,
      )}</strong> d'un montant de <strong>${escapeHtml(total)}</strong>.</p>
      <p style="color:#475569">Merci de nous confirmer sa bonne réception.</p>
      <p style="margin-top:24px">Cordialement,<br>${escapeHtml(orgName)}</p>
    </div>
  </div></body></html>`;

  const text = `Bonjour ${supplierName},

Veuillez trouver ci-joint notre bon de commande ${reference} d'un montant de ${total}.
Merci de nous confirmer sa bonne réception.

Cordialement,
${orgName}
`;

  return { subject: `Bon de commande ${reference} — ${orgName}`, html, text };
}
