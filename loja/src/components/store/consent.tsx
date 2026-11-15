"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_COOKIE, track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

type Consent = "all" | "essential" | null;

function readConsent(): Consent {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(all|essential)`));
  return (m?.[1] as Consent) ?? null;
}

function saveConsent(v: "all" | "essential") {
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${180 * 86400}; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  window.dispatchEvent(new Event("mk-consent"));
}

/** Banner LGPD: cookies de análise e marketing só carregam após aceite explícito. */
export function ConsentManager({ ga4Id, metaPixelId }: { ga4Id: string; metaPixelId: string }) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
    const on = () => setConsent(readConsent());
    const reopen = () => setConsent(null);
    window.addEventListener("mk-consent", on);
    window.addEventListener("mk-consent-reopen", reopen);
    return () => { window.removeEventListener("mk-consent", on); window.removeEventListener("mk-consent-reopen", reopen); };
  }, []);

  useEffect(() => {
    if (consent === "all") track("page_view");
  }, [pathname, consent]);

  return (
    <>
      {consent === "all" && ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {consent === "all" && metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}</Script>
      )}
      {ready && consent === null && (
        <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl animate-[rise_.5s_var(--ease-out-soft)] border border-line bg-surface p-5 shadow-[0_12px_40px_-12px_rgba(25,24,22,.35)] md:inset-x-6 md:bottom-6" role="dialog" aria-label="Preferências de cookies">
          <p className="text-sm leading-relaxed text-ink-2">
            Usamos cookies essenciais para o carrinho e o login. Com sua permissão, também usamos cookies de análise e marketing para entender a navegação e melhorar a loja.{" "}
            <Link href="/politica-de-privacidade" className="underline underline-offset-2">Saiba mais</Link>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => saveConsent("all")}>Aceitar todos</Button>
            <Button size="sm" variant="outline" onClick={() => saveConsent("essential")}>Somente essenciais</Button>
          </div>
        </div>
      )}
    </>
  );
}

export function ConsentReopen() {
  return (
    <button type="button" className="link-draw" onClick={() => window.dispatchEvent(new Event("mk-consent-reopen"))}>
      Preferências de cookies
    </button>
  );
}
