import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface RegionItem {
  id: string;
  name: string;
  parent_id: string | null;
  type?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

interface Props {
  regions: RegionItem[];
  /** Selected leaf-or-any region id (the deepest selection). Empty = none. */
  value: string;
  onChange: (id: string) => void;
  /** Optional labels per level (Şəhər, Rayon, Qəsəbə/Kənd, ...) */
  levelLabels?: string[];
  placeholderRoot?: string;
  placeholderChild?: string;
}

const defaultLabels = ["Şəhər", "Rayon", "Qəsəbə / Kənd"];

const RegionCascader = ({
  regions,
  value,
  onChange,
  levelLabels = defaultLabels,
  placeholderRoot = "Şəhər seçin",
  placeholderChild = "Seçin",
}: Props) => {
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

  // Build the chain of selected ids from root → ... → value
  const chain = useMemo(() => {
    const ids: string[] = [];
    let cur = value ? byId.get(value) || null : null;
    while (cur) {
      ids.unshift(cur.id);
      cur = cur.parent_id ? byId.get(cur.parent_id) || null : null;
    }
    return ids;
  }, [value, byId]);

  // Levels to render: always root level; for each selected id with children, add another level
  const levels: { parentId: string | null; selectedId: string; items: RegionItem[] }[] = [];
  // Level 0
  levels.push({
    parentId: null,
    selectedId: chain[0] || "",
    items: childrenByParent["__root__"] || [],
  });
  // Subsequent levels — if previously selected has children
  for (let i = 0; i < chain.length; i++) {
    const kids = childrenByParent[chain[i]] || [];
    if (kids.length > 0) {
      levels.push({
        parentId: chain[i],
        selectedId: chain[i + 1] || "",
        items: kids,
      });
    }
  }

  const handleLevelChange = (levelIdx: number, newId: string) => {
    // When user picks at level N, the value becomes that id (truncating any deeper chain)
    onChange(newId);
  };

  return (
    <div className="space-y-3">
      {levels.map((lvl, idx) => (
        <div key={lvl.parentId ?? "root"} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {levelLabels[idx] || `Səviyyə ${idx + 1}`}
          </Label>
          <Select
            value={lvl.selectedId || undefined}
            onValueChange={(v) => handleLevelChange(idx, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={idx === 0 ? placeholderRoot : placeholderChild} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {lvl.items.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
};

export default RegionCascader;
