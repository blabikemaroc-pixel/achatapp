import { prisma } from "@/lib/db";
import { getOrgContext } from "@/lib/auth-helpers";
import { generatePoPdf, loadPoPdfData } from "@/lib/po-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { orgId, name } = await getOrgContext();

  const data = await loadPoPdfData(id, orgId);
  if (!data) return new Response("Introuvable", { status: 404 });

  data.printedBy = name;

  // Increment print count
  await prisma.purchaseOrder.update({
    where: { id },
    data: { printCount: { increment: 1 } },
  });
  data.printCount = (data.printCount || 0) + 1; // Update locally for this generation

  const pdf = await generatePoPdf(data);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${data.reference}.pdf"`,
    },
  });
}
