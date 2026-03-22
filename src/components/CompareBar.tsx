import { useNavigate } from "react-router-dom";
import { useCompare } from "@/contexts/CompareContext";
import { Button } from "@/components/ui/button";
import { X, GitCompareArrows } from "lucide-react";

const CompareBar = () => {
  const { items, remove, clear } = useCompare();
  const navigate = useNavigate();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl shadow-2xl md:bottom-0">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        {/* Items */}
        <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide">
          {items.map(item => (
            <div key={item.id} className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-primary/40 bg-muted">
              <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
              <button
                onClick={() => remove(item.id)}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: 4 - items.length }).map((_, i) => (
            <div
              key={i}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-[10px] text-muted-foreground"
            >
              +
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:block">
            {items.length}/4 elan
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            disabled={items.length < 2}
            onClick={() => navigate("/compare")}
            className="gap-1.5 bg-gradient-primary text-primary-foreground h-9 px-4"
          >
            <GitCompareArrows className="h-4 w-4" />
            Müqayisə et
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompareBar;
