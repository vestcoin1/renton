import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "renton.saved-properties";

interface FavoritesContextValue {
  favoriteIds: string[];
  ready: boolean;
  toggleFavorite: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value) setFavoriteIds(JSON.parse(value) as string[]);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const toggleFavorite = (id: string) => {
    const nextIds = favoriteIds.includes(id)
      ? favoriteIds.filter((favoriteId) => favoriteId !== id)
      : [...favoriteIds, id];
    setFavoriteIds(nextIds);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextIds));
  };

  return (
    <FavoritesContext.Provider value={{ favoriteIds, ready, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavorites must be used inside FavoritesProvider");
  return context;
}