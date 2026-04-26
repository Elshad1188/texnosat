import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, MapPin, Search, X, ArrowLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface RegionItem {
  id: string;
  name: string;
  parent_id: string | null;
  type?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

interface RegionPickerProps {
  regions: RegionItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allLabel?: string;
  showAll?: boolean;
  className?: string;
  required?: boolean;
}

const normalize = (s: string) =>
  s.toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o")
    .replace(/ü/g, "u").replace(/ğ/g, "g").replace(/ş/g, "s")
    .replace(/ç/g, "c");

const RegionPicker = ({
  regions,
  value,
  onChange,
  placeholder = "Bölgə seçin",
  allLabel = "Bütün bölgələr",
  showAll = true,
  className,
  required = false,
}: RegionPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  /** Stack of parent IDs being navigated. Empty = root level. */
  const [stack, setStack] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onlyRegions = useMemo(
    () => regions.filter((r) => (r.type || "region") === "region" && r.is_active !== false),
    [regions]
  );

  const byId = useMemo(() => {
    const m = new Map<string, RegionItem>();
    for (const r of onlyRegions) m.set(r.id, r);
    return m;
  }, [onlyRegions]);

  const childrenByParent = useMemo(() => {
    const map: Record<string, RegionItem[]> = { __root__: [] };
    for (const r of onlyRegions) {
      const key = r.parent_id || "__root__";
      (map[key] ||= []).push(r);
    }
    for (const k of Object.keys(map)) {
      map[k].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "az")
      );
    }
    return map;
  }, [onlyRegions]);

  const hasChildren = (id: string) => (childrenByParent[id]?.length ?? 0) > 0;

  const selected = value ? byId.get(value) || null : null;
  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    // Build breadcrumb path
    const path: string[] = [];
    let cur: RegionItem | null = selected;
    while (cur) {
      path.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return path.join(" • ");
  }, [selected, byId]);

  // When opening: focus search; if a value is set, navigate stack to its parent so it's visible
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (selected) {
        const path: string[] = [];
        let cur = selected.parent_id ? byId.get(selected.parent_id) || null : null;
        while (cur) {
          path.unshift(cur.id);
          cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
        }
        setStack(path);
      } else {
        setStack([]);
      }
    } else {
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const q = normalize(search.trim());

  // Search mode: flat list of all matches (any depth)
  const searchResults = useMemo(() => {
    if (!q) return [];
    return onlyRegions
      .filter((r) => normalize(r.name).includes(q))
      .slice(0, 100)
      .sort((a, b) => {
        // Parents first, then by name
        const ad = a.parent_id ? 1 : 0;
        const bd = b.parent_id ? 1 : 0;
        if (ad !== bd) return ad - bd;
        return a.name.localeCompare(b.name, "az");
      });
  }, [q, onlyRegions]);

  const buildPath = (r: RegionItem) => {
    const out: string[] = [];
    let cur: RegionItem | null = r;
    while (cur) {
      out.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return out.join(" › ");
  };

  const currentParentId = stack.length > 0 ? stack[stack.length - 1] : null;
  const currentList = currentParentId
    ? childrenByParent[currentParentId] || []
    : childrenByParent["__root__"] || [];
  const currentParent = currentParentId ? byId.get(currentParentId) : null;

  const breadcrumbs = useMemo(() => stack.map((id) => byId.get(id)).filter(Boolean) as RegionItem[], [stack, byId]);

  const handleItemClick = (r: RegionItem) => {
    if (hasChildren(r.id)) {
      // Has children → drill down (do NOT select yet)
      setStack((s) => [...s, r.id]);
      setSearch("");
    } else {
      // Leaf → select and close
      onChange(r.id);
      setOpen(false);
    }
  };

  const selectCurrentParent = () => {
    if (currentParentId) {
      onChange(currentParentId);
      setOpen(false);
    }
  };

  const goBack = () => {
    setStack((s) => s.slice(0, -1));
    setSearch("");
  };

  const goRoot = () => {
    setStack([]);
    setSearch("");
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{selectedLabel || placeholder}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            {!required && selected && (
              <span
                role="button"
                onClick={clear}
                className="rounded-sm p-0.5 hover:bg-muted"
                aria-label="Təmizlə"
              >
                <X className="h-3.5 w-3.5 opacity-60" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0" align="start">
        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Şəhər, rayon, qəsəbə..."
              className="pl-8 h-9"
            />
          </div>
        </div>

        {/* Breadcrumb / back nav (hidden during search) */}
        {!q && stack.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30 text-xs">
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Geri
            </button>
            <span className="text-muted-foreground/60">|</span>
            <button
              type="button"
              onClick={goRoot}
              className="px-1.5 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              Şəhərlər
            </button>
            {breadcrumbs.map((b, i) => (
              <div key={b.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
                <button
                  type="button"
                  onClick={() => setStack((s) => s.slice(0, i + 1))}
                  className={cn(
                    "px-1.5 py-1 rounded hover:bg-accent truncate",
                    i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {b.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* "Use this region" shortcut when drilled into a parent */}
        {!q && currentParent && (
          <button
            type="button"
            onClick={selectCurrentParent}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm border-b border-border hover:bg-accent",
              value === currentParent.id && "bg-accent"
            )}
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span>Bütün <span className="font-medium">{currentParent.name}</span></span>
            </span>
            {value === currentParent.id && <Check className="h-4 w-4" />}
          </button>
        )}

        <ScrollArea className="max-h-72">
          <div className="p-1">
            {/* Search results */}
            {q ? (
              searchResults.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Heç nə tapılmadı
                </div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (hasChildren(r.id)) {
                        // Drill into it
                        const path: string[] = [];
                        let cur: RegionItem | null = r;
                        while (cur) {
                          path.unshift(cur.id);
                          cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
                        }
                        setStack(path);
                        setSearch("");
                      } else {
                        onChange(r.id);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between gap-2",
                      value === r.id && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{r.name}</span>
                      {r.parent_id && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {buildPath(r)}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {hasChildren(r.id) && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {value === r.id && <Check className="h-4 w-4" />}
                    </span>
                  </button>
                ))
              )
            ) : (
              <>
                {/* "All" option only at root level */}
                {showAll && stack.length === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between",
                      !value && "bg-accent"
                    )}
                  >
                    <span className="text-muted-foreground">{allLabel}</span>
                    {!value && <Check className="h-4 w-4" />}
                  </button>
                )}

                {currentList.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    Alt bölgə yoxdur
                  </div>
                ) : (
                  currentList.map((r) => {
                    const drillable = hasChildren(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleItemClick(r)}
                        className={cn(
                          "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between gap-2",
                          value === r.id && "bg-accent"
                        )}
                      >
                        <span className="truncate">{r.name}</span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          {drillable && (
                            <>
                              <span className="text-[10px] text-muted-foreground">
                                {childrenByParent[r.id].length}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </>
                          )}
                          {value === r.id && !drillable && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default RegionPicker;
