import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

const StaticPage = () => {
  const { slug } = useParams();

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : page ? (
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-3xl font-bold text-foreground mb-6">{page.title}</h1>
            <div className="prose prose-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {(page as any).content}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-xl font-bold text-foreground">Səhifə tapılmadı</h2>
            <p className="mt-2 text-sm text-muted-foreground">Bu səhifə mövcud deyil və ya yayımlanmayıb.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StaticPage;
