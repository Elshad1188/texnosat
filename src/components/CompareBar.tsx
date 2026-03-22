import { useNavigate } from "react-router-dom";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { X, GitCompareArrows } from "lucide-react";

const CompareBar = () => {
  const { items, remove, clear } = useCompare();
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <>
      {/* Mobile: sits above bottom nav (h-14 = 3.5rem + safe area) */}
      <div className="md:hidden fixed left-0 right-0 z-40 border-t border-border bg-card/97 backdrop-blur-xl shadow-2xl"
        style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}>
        <CompareBarContent items={items} remove={remove} clear={clear} navigate={navigate} />
      </div>

      {/* Desktop: fixed to very bottom */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/97 backdrop-blur-xl shadow-2xl">
        <CompareBarContent items={items} remove={remove} clear={clear} navigate={navigate} />
      </div>
    </>
  );
};

const CompareBarContent = ({ items, remove, clear, navigate }: any) => (
  <div className="container mx-auto flex items-center gap-3 px-4 py-2.5">
    {/* Thumbnails */}
    <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide min-w-0">
      {items.map((item: any) => (
        <div key={item.id} className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-primary/50 bg-muted">
          <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          <button
            onClick={() => remove(item.id)}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
      {Array.from({ length: 4 - items.length }).map((_, i) => (
        <div
          key={i}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground"
        >
          +
        </div>
      ))}
    </div>

    <div className="flex shrink-0 items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:block">{items.length}/4</span>
      <button onClick={clear} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
        <X className="h-4 w-4" />
      </button>
      <Button
        size="sm"
        disabled={items.length < 2}
        onClick={() => navigate("/compare")}
        className="gap-1.5 bg-gradient-primary text-primary-foreground h-9 px-4 text-xs font-semibold"
      >
        <GitCompareArrows className="h-4 w-4" />
        <span className="hidden xs:inline">Müqayisə et</span>
        <span className="xs:hidden">Müq.</span>
      </Button>
    </div>
  </div>
);

export default CompareBar;
