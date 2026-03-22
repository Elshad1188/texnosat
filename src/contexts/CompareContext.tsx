import { createContext, useContext, useState, ReactNode } from "react";

export interface CompareItem {
  id: string;
  title: string;
  price: string;
  image: string;
  location: string;
  condition?: string;
  category?: string;
}

interface CompareContextType {
  items: CompareItem[];
  add: (item: CompareItem) => void;
  remove: (id: string) => void;
  toggle: (item: CompareItem) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

const CompareContext = createContext<CompareContextType | null>(null);

export const CompareProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CompareItem[]>([]);

  const add = (item: CompareItem) => {
    setItems(prev => prev.length < 4 ? [...prev, item] : prev);
  };

  const remove = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const toggle = (item: CompareItem) => {
    setItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev.filter(i => i.id !== item.id);
      if (prev.length >= 4) return prev;
      return [...prev, item];
    });
  };

  const has = (id: string) => items.some(i => i.id === id);
  const clear = () => setItems([]);

  return (
    <CompareContext.Provider value={{ items, add, remove, toggle, has, clear }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};
