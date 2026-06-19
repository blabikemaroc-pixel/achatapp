import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getFile } from "@/lib/files";

// Sert un fichier stocké en base. Protégé : seul un membre connecté de
// l'organisation propriétaire du fichier peut le télécharger.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const orgId = session?.user?.orgId;
  if (!orgId) {
    return new NextResponse("Non autorisé", { status: 401 });
  }

  const { id } = await params;
  const file = await getFile(orgId, id);
  if (!file) {
    return new NextResponse("Fichier introuvable", { status: 404 });
  }

  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
