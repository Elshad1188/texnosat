import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X, ChevronRight } from "lucide-react";
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
  /** ID of currently selected region (parent or child). Empty string means none. */
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  allLabel?: string;
  showAll?: boolean;
  className?: string;
  /** Restrict to a single parent (for child-only pickers); when set, parent list is hidden */
  parentId?: string | null;
  /** Hide the "Hamısı" option entirely */
  required?: boolean;
}

/**
 * Hierarchical, searchable region picker.
 * - Lists parent cities/regions, expandable to reveal children (rayon/qəsəbə/kənd).
 * - Real-time fuzzy search across the entire tree.
 * - Selecting a parent filters by city; selecting a child narrows further.
 */
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
  parentId = null,
  required = false,
}: RegionPickerProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const onlyRegions = useMemo(
    () => regions.filter((r) => (r.type || "region") === "region" && r.is_active !== false),
    [regions]
  );

  const parents = useMemo(() => {
    if (parentId) return [];
    return onlyRegions
      .filter((r) => !r.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "az"));
  }, [onlyRegions, parentId]);

  const childrenByParent = useMemo(() => {
    const map: Record<string, RegionItem[]> = {};
    for (const r of onlyRegions) {
      if (r.parent_id) {
        (map[r.parent_id] ||= []).push(r);
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "az"));
    }
    return map;
  }, [onlyRegions]);

  const selected = useMemo(() => onlyRegions.find((r) => r.id === value) || null, [onlyRegions, value]);
  const selectedLabel = useMemo(() => {
    if (!selected) return "";
    if (selected.parent_id) {
      const parent = onlyRegions.find((r) => r.id === selected.parent_id);
      return parent ? `${parent.name} • ${selected.name}` : selected.name;
    }
    return selected.name;
  }, [selected, onlyRegions]);

  // Focus search and auto-expand parent of current value when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (selected?.parent_id) {
        setExpanded((prev) => new Set(prev).add(selected.parent_id!));
      }
    } else {
      setSearch("");
    }
  }, [open, selected]);

  const q = normalize(search.trim());

  // When searching, flatten matches and auto-expand any parent with a child match
  const matchedParentIds = useMemo(() => {
    if (!q) return null;
    const set = new Set<string>();
    for (const p of parents) {
      if (normalize(p.name).includes(q)) set.add(p.id);
      const kids = childrenByParent[p.id] || [];
      if (kids.some((c) => normalize(c.name).includes(q))) set.add(p.id);
    }
    return set;
  }, [q, parents, childrenByParent]);

  const visibleParents = matchedParentIds ? parents.filter((p) => matchedParentIds.has(p.id)) : parents;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  // Child-only picker (used inside CreateListing once parent city is chosen)
  if (parentId) {
    const kids = (childrenByParent[parentId] || []).filter(
      (c) => !q || normalize(c.name).includes(q)
    );
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn("w-full justify-between font-normal", className)}
          >
            <span className="flex items-center gap-2 truncate">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {selected?.name || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Axtar..."
                className="pl-8 h-9"
              />
            </div>
          </div>
          <ScrollArea className="max-h-72">
            <div className="p-1">
              {showAll && (
                <button
                  type="button"
                  onClick={() => select("")}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between",
                    !value && "bg-accent"
                  )}
                >
                  <span className="text-muted-foreground">{allLabel}</span>
                  {!value && <Check className="h-4 w-4" />}
                </button>
              )}
              {kids.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">Heç nə tapılmadı</div>
              ) : (
                kids.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => select(c.id)}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between",
                      value === c.id && "bg-accent"
                    )}
                  >
                    <span>{c.name}</span>
                    {value === c.id && <Check className="h-4 w-4" />}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    );
  }

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
        <ScrollArea className="max-h-80">
          <div className="p-1">
            {showAll && !q && (
              <button
                type="button"
                onClick={() => select("")}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md text-sm hover:bg-accent flex items-center justify-between",
                  !value && "bg-accent"
                )}
              >
                <span className="text-muted-foreground">{allLabel}</span>
                {!value && <Check className="h-4 w-4" />}
              </button>
            )}

            {visibleParents.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Heç nə tapılmadı
              </div>
            ) : (
              visibleParents.map((p) => {
                const kids = childrenByParent[p.id] || [];
                const isExpanded = expanded.has(p.id) || !!q;
                const visibleKids = q
                  ? kids.filter((c) => normalize(c.name).includes(q))
                  : kids;
                const parentMatches = !q || normalize(p.name).includes(q);
                return (
                  <div key={p.id} className="mb-0.5">
                    <div
                      className={cn(
                        "group flex items-stretch rounded-md hover:bg-accent",
                        value === p.id && "bg-accent"
                      )}
                    >
                      {kids.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.id)}
                          className="flex items-center px-1.5 hover:bg-muted/50 rounded-l-md"
                          aria-label={isExpanded ? "Bağla" : "Aç"}
                        >
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90"
                            )}
                          />
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                      <button
                        type="button"
                        onClick={() => select(p.id)}
                        className="flex-1 text-left py-2 pr-2 text-sm flex items-center justify-between"
                      >
                        <span className={cn("font-medium", !parentMatches && "text-muted-foreground")}>
                          {p.name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {kids.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{kids.length}</span>
                          )}
                          {value === p.id && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    </div>
                    {isExpanded && visibleKids.length > 0 && (
                      <div className="ml-6 border-l border-border/60 pl-1 mt-0.5 space-y-0.5">
                        {visibleKids.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => select(c.id)}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-md text-sm hover:bg-accent flex items-center justify-between",
                              value === c.id && "bg-accent"
                            )}
                          >
                            <span>{c.name}</span>
                            {value === c.id && <Check className="h-3.5 w-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default RegionPicker;
