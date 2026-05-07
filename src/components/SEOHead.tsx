import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string; // og:type
  keywords?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noIndex?: boolean;
}

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
};

const upsertJsonLd = (id: string, data: any) => {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-seo", id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
};

const SEOHead = ({ title, description, image, type = "website", keywords, jsonLd, noIndex }: SEOHeadProps) => {
  const location = useLocation();

  const { data: seo } = useQuery({
    queryKey: ["site-settings-seo"],
    queryFn: async () => {
      const [{ data: general }, { data: seoData }] = await Promise.all([
        supabase.from("site_settings").select("value").eq("key", "general").maybeSingle(),
        supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle(),
      ]);
      return {
        general: (general?.value as any) || {},
        seo: (seoData?.value as any) || {},
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const g = seo?.general || {};
    const s = seo?.seo || {};
    const siteName = g.site_name || "Elan24";
    const baseTitle = title || g.meta_title || siteName;
    const finalTitle = title && g.meta_title ? `${title} | ${siteName}` : baseTitle;
    const finalDesc = description || g.meta_description || g.site_description || "";
    const finalImage = image || s.og_image || g.watermark_url || "https://elan24.az/pwa-512.png";
    const finalKeywords = keywords || s.keywords || "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://elan24.az";
    const url = `${origin}${location.pathname}${location.search}`;

    document.title = finalTitle;

    upsertMeta('meta[name="description"]', "name", "description", finalDesc);
    if (finalKeywords) upsertMeta('meta[name="keywords"]', "name", "keywords", finalKeywords);
    upsertMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
    upsertMeta('meta[name="author"]', "name", "author", siteName);

    // Open Graph
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:title"]', "property", "og:title", finalTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", finalDesc);
    upsertMeta('meta[property="og:image"]', "property", "og:image", finalImage);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", siteName);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "az_AZ");

    // Twitter
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", finalTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDesc);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", finalImage);

    // Canonical
    upsertLink("canonical", url);

    // Verification
    if (s.google_site_verification) upsertMeta('meta[name="google-site-verification"]', "name", "google-site-verification", s.google_site_verification);
    if (s.yandex_verification) upsertMeta('meta[name="yandex-verification"]', "name", "yandex-verification", s.yandex_verification);
    if (s.bing_verification) upsertMeta('meta[name="msvalidate.01"]', "name", "msvalidate.01", s.bing_verification);
    if (s.facebook_domain_verification) upsertMeta('meta[name="facebook-domain-verification"]', "name", "facebook-domain-verification", s.facebook_domain_verification);

    // Organization JSON-LD (global, only on home/once)
    if (location.pathname === "/" || location.pathname === "") {
      upsertJsonLd("organization", {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: origin,
        logo: finalImage,
        sameAs: s.social_links ? Object.values(s.social_links).filter(Boolean) : undefined,
        contactPoint: g.contact_phone
          ? [{ "@type": "ContactPoint", telephone: g.contact_phone, contactType: "customer service", email: g.contact_email }]
          : undefined,
      });
      upsertJsonLd("website", {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: origin,
        potentialAction: {
          "@type": "SearchAction",
          target: `${origin}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      });
    }

    // Page-specific JSON-LD
    if (jsonLd) upsertJsonLd("page", jsonLd);
  }, [title, description, image, type, keywords, jsonLd, noIndex, seo, location.pathname, location.search]);

  return null;
};

export default SEOHead;
