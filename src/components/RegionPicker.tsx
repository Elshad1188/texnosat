import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
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
  /** Path of expanded parent IDs (level 0 = root city, level 1 = district, ...) */
  const [path, setPath] = useState<string[]>([]);
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
    const parts: string[] = [];
    let cur: RegionItem | null = selected;
    while (cur) {
      parts.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return parts.join(" • ");
  }, [selected, byId]);

  // When opening: focus search; if a value is set, auto-expand path to its ancestors
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (selected) {
        const ancestors: string[] = [];
        let cur: RegionItem | null = selected.parent_id ? byId.get(selected.parent_id) || null : null;
        while (cur) {
          ancestors.unshift(cur.id);
          cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
        }
        // If selected itself has children (parent selected), also expand it
        if (hasChildren(selected.id)) ancestors.push(selected.id);
        setPath(ancestors);
      } else {
        setPath([]);
      }
    } else {
      setSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const q = normalize(search.trim());

  const buildPathLabel = (r: RegionItem) => {
    const out: string[] = [];
    let cur: RegionItem | null = r;
    while (cur) {
      out.unshift(cur.name);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return out.join(" › ");
  };

  // Search mode
  const searchResults = useMemo(() => {
    if (!q) return [];
    return onlyRegions
      .filter((r) => normalize(r.name).includes(q))
      .slice(0, 100)
      .sort((a, b) => {
        const ad = a.parent_id ? 1 : 0;
        const bd = b.parent_id ? 1 : 0;
        if (ad !== bd) return ad - bd;
        return a.name.localeCompare(b.name, "az");
      });
  }, [q, onlyRegions]);

  /** Handle click on a row in level N. */
  const handlePick = (r: RegionItem, level: number) => {
    onChange(r.id);
    if (hasChildren(r.id)) {
      // Expand a new level below, replacing any deeper levels
      setPath((p) => [...p.slice(0, level), r.id]);
    } else {
      // Leaf — select and close
      setPath((p) => p.slice(0, level));
      setOpen(false);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setPath([]);
  };

  // Build the columns to render: root, then one per expanded path entry
  const columns = useMemo(() => {
    const cols: { parentId: string | null; items: RegionItem[]; parent: RegionItem | null }[] = [
      { parentId: null, items: childrenByParent["__root__"] || [], parent: null },
    ];
    for (const pid of path) {
      const kids = childrenByParent[pid] || [];
      if (kids.length === 0) break;
      cols.push({ parentId: pid, items: kids, parent: byId.get(pid) || null });
    }
    return cols;
  }, [path, childrenByParent, byId]);

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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
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

        <ScrollArea className="max-h-[420px]">
          <div className="p-1">
            {q ? (
              // ===== Search results =====
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
                      onChange(r.id);
                      // Expand path to include this and its ancestors
                      const ancestors: string[] = [];
                      let cur: RegionItem | null = r.parent_id ? byId.get(r.parent_id) || null : null;
                      while (cur) {
                        ancestors.unshift(cur.id);
                        cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
                      }
                      if (hasChildren(r.id)) ancestors.push(r.id);
                      setPath(ancestors);
                      setSearch("");
                      if (!hasChildren(r.id)) setOpen(false);
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
                          {buildPathLabel(r)}
                        </span>
                      )}
                    </div>
                    {value === r.id && <Check className="h-4 w-4 flex-shrink-0" />}
                  </button>
                ))
              )
            ) : (
              // ===== Stacked levels =====
              <div className="space-y-2">
                {/* "All" only at top */}
                {showAll && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setPath([]);
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

                {columns.map((col, level) => (
                  <div
                    key={col.parentId ?? "root"}
                    className={cn(
                      "rounded-md",
                      level > 0 && "border border-border bg-muted/20"
                    )}
                  >
                    {col.parent && (
                      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-muted/40 rounded-t-md">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                          {col.parent.name} • alt bölgələr
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            // Select the parent itself (e.g. "all of Baku") and close
                            onChange(col.parent!.id);
                            setPath((p) => p.slice(0, level));
                            setOpen(false);
                          }}
                          className="text-[11px] text-primary hover:underline flex-shrink-0 ml-2"
                        >
                          Bütün {col.parent.name}
                        </button>
                      </div>
                    )}
                    <div className="p-1">
                      {col.items.map((r) => {
                        const drillable = hasChildren(r.id);
                        const isExpanded = path[level] === r.id;
                        const isSelected = value === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handlePick(r, level)}
                            className={cn(
                              "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between gap-2",
                              isExpanded && "bg-accent/70",
                              isSelected && "bg-accent font-medium"
                            )}
                          >
                            <span className="truncate">{r.name}</span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                              {drillable && (
                                <span className="text-[10px] text-muted-foreground">
                                  {childrenByParent[r.id].length}
                                </span>
                              )}
                              {isSelected && <Check className="h-4 w-4" />}
                              {drillable && !isSelected && (
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                    isExpanded && "rotate-180"
                                  )}
                                />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default RegionPicker;
