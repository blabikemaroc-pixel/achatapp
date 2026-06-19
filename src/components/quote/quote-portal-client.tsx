"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, FileText, Send, Building2, CalendarDays, MapPin } from "lucide-react";
import { toast } from "sonner";

import { submitQuote } from "@/app/quote/actions";
import { type QuoteFormItem, type QuoteInitial } from "@/components/quote/quote-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";

export function QuotePortalClient({
  token,
  items,
  initial,
  alreadyResponded,
  supplierName,
  orgName,
  orgCity,
  rfqReference,
  rfqNotes,
}: {
  token: string;
  items: QuoteFormItem[];
  initial?: QuoteInitial;
  alreadyResponded: boolean;
  supplierName: string;
  orgName: string;
  orgCity: string | null;
  rfqReference: string;
  rfqNotes: string | null;
}) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const [prices, setPrices] = useState<Record<string, string>>(initial?.prices ?? {});

  const total = items.reduce((sum, it) => {
    const price = Number(prices[it.productId]);
    return sum + (Number.isFinite(price) ? price * it.requestedQty : 0);
  }, 0);

  const submit = () => {
    const builtItems = items
      .map((it) => ({
        productId: it.productId,
        unitPrice: Number(prices[it.productId]),
      }))
      .filter((i) => Number.isFinite(i.unitPrice) && i.unitPrice > 0);

    if (builtItems.length !== items.length) {
      toast.error("Veuillez indiquer un prix valide pour toutes les prestations.");
      return;
    }

    startTransition(async () => {
      const res = await submitQuote(token, {
        items: builtItems,
      });
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Devis enregistré.");
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="rounded-full bg-green-100 p-6 shadow-sm">
          <CheckCircle2 className="size-20 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Merci, votre offre a bien été transmise !</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Nous avons bien reçu votre proposition tarifaire. Vous pouvez maintenant fermer cette page en toute sécurité.
          </p>
        </div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  
  const displayCity = orgCity ? orgCity.toUpperCase() : "CASABLANCA";

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-blue-100 backdrop-blur-md mb-2 border border-white/10">
              <FileText className="size-4" />
              <span>Demande de Devis Officielle</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {rfqNotes ? rfqNotes : `Prestations (${rfqReference})`}
            </h1>
            <p className="text-blue-200 text-lg max-w-xl leading-relaxed">
              Veuillez nous adresser votre meilleure offre de prix et conditions pour la réalisation des services ci-dessous.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[280px] shadow-lg">
            <p className="text-sm text-blue-200 uppercase tracking-wider font-semibold mb-1">Destinataire</p>
            <p className="text-xl font-bold text-white mb-4">{supplierName}</p>
            <div className="space-y-2 text-sm text-blue-100">
              <div className="flex items-center gap-2"><Building2 className="size-4 opacity-70"/> {orgName}</div>
              <div className="flex items-center gap-2"><MapPin className="size-4 opacity-70"/> {displayCity}</div>
              <div className="flex items-center gap-2"><CalendarDays className="size-4 opacity-70"/> {currentDate}</div>
            </div>
          </div>
        </div>
      </div>

      {alreadyResponded ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800 shadow-sm flex items-center gap-3">
          <CheckCircle2 className="size-5 text-blue-600" />
          <span className="font-medium">Vous avez déjà soumis une offre pour cette demande. Toute nouvelle validation mettra à jour vos prix.</span>
        </div>
      ) : null}

      {/* TABLE SECTION */}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 p-6">
          <h2 className="text-xl font-bold text-gray-900">Détails de la demande</h2>
          <p className="text-sm text-gray-500 mt-1">Saisissez vos tarifs unitaires hors taxes dans la colonne de droite.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold tracking-wide text-gray-600 uppercase">
                <th className="px-6 py-4 w-1/3">Titre de la prestation</th>
                <th className="px-6 py-4 w-5/12">Détails & Action</th>
                <th className="px-6 py-4 text-center">Prix Forfaitaire (HT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.productId} className="group hover:bg-slate-50 transition-colors duration-200">
                  <td className="px-6 py-5 align-top">
                    <p className="font-semibold text-gray-900">{it.name}</p>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                      Quantité: <span className="font-bold">{it.requestedQty} {it.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-center justify-center gap-2">
                      <div className="relative group-hover:scale-105 transition-transform duration-200">
                        <Input
                          inputMode="decimal"
                          placeholder="0.00"
                          className="text-right tabular-nums w-40 h-12 pr-12 text-lg font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-blue-500 border-gray-300"
                          value={prices[it.productId] ?? ""}
                          onChange={(e) =>
                            setPrices((p) => ({ ...p, [it.productId]: e.target.value }))
                          }
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                          MAD
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* TOTAL & FOOTER */}
        <div className="bg-slate-50 border-t border-gray-200 p-6 sm:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Montant Total Estimé (HT)</p>
            <p className="text-4xl font-extrabold tracking-tight text-blue-900">
              {formatCurrency(total)}
            </p>
          </div>
          
          <Button 
            onClick={submit} 
            disabled={pending} 
            size="lg" 
            className="w-full md:w-auto h-14 px-8 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-blue-600 hover:bg-blue-700"
          >
            {pending ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <Send className="mr-2 size-5" />
            )}
            Soumettre mon offre
          </Button>
        </div>
      </div>
      
      <p className="text-center text-sm text-gray-400 pb-8">
        Dans l'attente de votre accord, nous vous prions d'agréer nos salutations les plus distinguées.
      </p>
    </div>
  );
}
