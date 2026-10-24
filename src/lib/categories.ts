import { useQuery } from "@tanstack/react-query";
import { getCategories, type Category } from "./db";

// Fetched once per session and cached in memory.
let cache: Map<string, Category> | null = null;
let pending: Promise<Map<string, Category>> | null = null;

export function loadCategories(): Promise<Map<string, Category>> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = getCategories()
      .then((rows) => (cache = new Map(rows.map((c) => [c.key, c]))))
      .finally(() => (pending = null));
  }
  return pending;
}

function prettify(key: string) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Sync label lookup; falls back to a prettified key until categories are loaded. */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return "";
  return cache?.get(key)?.label ?? prettify(key);
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: async () => [...(await loadCategories()).values()], staleTime: Infinity });
}
