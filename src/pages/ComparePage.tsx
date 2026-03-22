import { useNavigate } from "react-router-dom";
import { useCompare } from "@/contexts/CompareContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X, MapPin, CheckCircle, XCircle } from "lucide-react";

const ComparePage = () => {
  const { items, remove, clear } = useCompare();
  const navigate = useNavigate();

  if (items.length < 2) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto flex flex-col items-center justify-center py-32 text-center px-4">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-foreground">Müqayisə üçün ən az 2 elan seçin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Elanlar səhifəsinə qayıdıb elanları müqayisəyə əlavə edin</p>
          <Button className="mt-6 gap-2 bg-gradient-primary text-primary-foreground" onClick={() => navigate("/products")}>
            <ArrowLeft className="h-4 w-4" /> Elanlara qayıt
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const rows = [
    { label: "Şəkil", key: "image", type: "image" },
    { label: "Başlıq", key: "title", type: "text" },
    { label: "Qiymət", key: "price", type: "price" },
    { label: "Bölgə", key: "location", type: "text" },
    { label: "Vəziyyət", key: "condition", type: "text" },
    { label: "Kateqoriya", key: "category", type: "text" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Geri
            </button>
            <h1 className="font-display text-xl font-bold text-foreground">
              Müqayisə ({items.length} elan)
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30"
            onClick={() => { clear(); navigate("/products"); }}
          >
            <X className="h-3.5 w-3.5" /> Sıfırla
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-32 p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Xüsusiyyət
                </th>
                {items.map(item => (
                  <th key={item.id} className="p-3 text-center">
                    <div className="relative inline-block">
                      <button
                        onClick={() => remove(item.id)}
                        className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => navigate(`/product/${item.id}`)}
                        className="text-xs font-semibold text-foreground hover:text-primary transition-colors line-clamp-2 max-w-[140px]"
                      >
                        {item.title}
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.key} className={`border-b border-border last:border-0 ${ri % 2 === 0 ? "" : "bg-muted/20"}`}>
                  <td className="p-3 text-xs font-semibold text-muted-foreground">{row.label}</td>
                  {items.map(item => {
                    const val = (item as any)[row.key];
                    return (
                      <td key={item.id} className="p-3 text-center">
                        {row.type === "image" ? (
                          <button onClick={() => navigate(`/product/${item.id}`)}>
                            <img
                              src={val || "/placeholder.svg"}
                              alt={item.title}
                              className="mx-auto h-28 w-full max-w-[160px] rounded-xl object-cover border border-border hover:scale-105 transition-transform"
                            />
                          </button>
                        ) : row.type === "price" ? (
                          <span className="text-base font-bold text-primary">{val}</span>
                        ) : (
                          <span className="text-sm text-foreground">{val || "—"}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Price comparison highlight */}
              {items.length >= 2 && (() => {
                const prices = items.map(i => parseFloat(i.price.replace(/[^\d.]/g, "")));
                const minPrice = Math.min(...prices);
                return (
                  <tr className="border-t-2 border-primary/20 bg-primary/5">
                    <td className="p-3 text-xs font-semibold text-primary">Ən sərfəli</td>
                    {items.map((item, idx) => (
                      <td key={item.id} className="p-3 text-center">
                        {prices[idx] === minPrice ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Ən ucuz</span>
                          </div>
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-muted-foreground/40" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {items.map(item => (
            <Button
              key={item.id}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => navigate(`/product/${item.id}`)}
            >
              {item.title.slice(0, 24)}... → Elana bax
            </Button>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ComparePage;
