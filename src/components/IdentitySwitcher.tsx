import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Store, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IdentitySwitcherProps {
  selectedStoreId: string | null;
  onSelect: (storeId: string | null) => void;
  compact?: boolean;
}

const IdentitySwitcher = ({ selectedStoreId, onSelect, compact = false }: IdentitySwitcherProps) => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: approvedStores = [] } = useQuery({
    queryKey: ["my-approved-stores", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("stores")
        .select("id, name, logo_url")
        .eq("user_id", user!.id)
        .eq("status", "approved");
      return data || [];
    },
    enabled: !!user,
  });

  if (approvedStores.length === 0) return null;

  const selectedStore = selectedStoreId ? approvedStores.find(s => s.id === selectedStoreId) : null;
  const displayName = selectedStore ? selectedStore.name : (profile?.full_name || "Şəxsi hesab");
  const displayAvatar = selectedStore?.logo_url || profile?.avatar_url || null;
  const isStore = !!selectedStore;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors ${compact ? "py-1 px-2" : ""}`}
        >
          <div className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary flex-shrink-0">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="h-full w-full object-cover" />
            ) : isStore ? (
              <Store className="h-3 w-3" />
            ) : (
              <User className="h-3 w-3" />
            )}
          </div>
          <span className="truncate max-w-[120px]">{displayName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuItem onClick={() => onSelect(null)} className="gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
          <span className="text-sm">{profile?.full_name || "Şəxsi hesab"}</span>
          {!selectedStoreId && <span className="ml-auto text-primary text-xs">✓</span>}
        </DropdownMenuItem>
        {approvedStores.map(store => (
          <DropdownMenuItem key={store.id} onClick={() => onSelect(store.id)} className="gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
              {store.logo_url ? (
                <img src={store.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Store className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <span className="text-sm truncate">{store.name}</span>
            {selectedStoreId === store.id && <span className="ml-auto text-primary text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default IdentitySwitcher;
