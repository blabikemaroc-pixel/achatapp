import "server-only";
import { prisma } from "@/lib/db";

// Limite de taille par fichier (logos, justificatifs, preuves). 8 Mo couvre
// largement scans PDF et photos ; protège la base d'un upload abusif.
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
};

function resolveMime(file: File): string | null {
  if (file.type && ALLOWED_MIME.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? null;
}

/**
 * Enregistre un fichier uploadé directement dans Postgres et renvoie son id.
 * Toujours rattaché à une organisation (cloisonnement).
 */
export async function saveFile(
  orgId: string,
  file: File,
  opts: { imagesOnly?: boolean } = {},
): Promise<{ id: string } | { error: string }> {
  if (!file || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_FILE_BYTES) {
    return { error: "Fichier trop volumineux (8 Mo maximum)." };
  }

  const mimeType = resolveMime(file);
  if (!mimeType) {
    return { error: "Format non supporté (PNG, JPG, WEBP ou PDF)." };
  }
  if (opts.imagesOnly && mimeType === "application/pdf") {
    return { error: "Le logo doit être une image (PNG, JPG ou WEBP)." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await prisma.storedFile.create({
    data: {
      orgId,
      filename: file.name.slice(0, 200),
      mimeType,
      size: buffer.length,
      data: buffer,
    },
    select: { id: true },
  });

  return { id: stored.id };
}

/** Récupère un fichier appartenant à l'organisation donnée. */
export async function getFile(orgId: string, id: string) {
  return prisma.storedFile.findFirst({
    where: { id, orgId },
    select: { data: true, mimeType: true, filename: true },
  });
}

/** Supprime un fichier (best-effort) — utilisé p.ex. au remplacement du logo. */
export async function deleteFile(orgId: string, id: string) {
  await prisma.storedFile.deleteMany({ where: { id, orgId } });
}
