import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, CheckCircle2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
  place_id: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onVerified?: (data: { address: string; lat: number; lon: number }) => void;
  placeholder?: string;
  className?: string;
}

const AddressAutocomplete = ({ value, onChange, onVerified, placeholder, className }: AddressAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setVerified(false);
      return;
    }
    if (value === lastQueryRef.current) return;

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=az&countrycodes=az&q=${encodeURIComponent(value)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "az" } });
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value]);

  const selectSuggestion = (s: Suggestion) => {
    lastQueryRef.current = s.display_name;
    onChange(s.display_name);
    setVerified(true);
    setOpen(false);
    setSuggestions([]);
    onVerified?.({ address: s.display_name, lat: parseFloat(s.lat), lon: parseFloat(s.lon) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => {
            setVerified(false);
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder || "Ünvanı yazın və siyahıdan seçin..."}
          className="pl-9 pr-10"
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : verified ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : null}
        </div>
      </div>

      {verified && (
        <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ünvan təsdiqləndi
        </p>
      )}
      {!verified && value.length >= 3 && !loading && suggestions.length === 0 && open === false && (
        <p className="mt-1 text-xs text-muted-foreground">Yazmağa davam edin və siyahıdan seçin...</p>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1">
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={s.place_id}
                type="button"
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors border-b border-border/50 last:border-0",
                  activeIdx === i ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground line-clamp-2">{s.display_name}</span>
              </button>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-muted/50 text-[10px] text-muted-foreground text-center border-t border-border">
            OpenStreetMap ilə dəstəklənir
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
