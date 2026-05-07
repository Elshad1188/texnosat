import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const inject = (id: string, html: string, target: "head" | "body" = "head") => {
  if (document.getElementById(id)) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  const node = wrapper.firstChild as HTMLElement;
  if (!node) return;
  node.id = id;
  (target === "head" ? document.head : document.body).appendChild(node);
};

const SEOAnalytics = () => {
  const { data: seo } = useQuery({
    queryKey: ["site-settings-seo"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "seo").maybeSingle();
      return (data?.value as any) || {};
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!seo) return;

    if (seo.google_analytics_id) {
      const id = seo.google_analytics_id;
      if (!document.getElementById("ga-src")) {
        const s = document.createElement("script");
        s.id = "ga-src";
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
        document.head.appendChild(s);
      }
      inject("ga-init", `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.google_analytics_id}');</script>`);
    }

    if (seo.google_tag_manager_id) {
      inject("gtm-init", `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${seo.google_tag_manager_id}');</script>`);
    }

    if (seo.facebook_pixel_id) {
      inject("fb-pixel", `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebook_pixel_id}');fbq('track','PageView');</script>`);
    }

    if (seo.yandex_metrica_id) {
      inject("ym-init", `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${seo.yandex_metrica_id},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>`);
    }
  }, [seo]);

  return null;
};

export default SEOAnalytics;
