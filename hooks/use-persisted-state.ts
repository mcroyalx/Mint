"use client";

import { useEffect } from "react";

/**
 * Syncs a state value to localStorage whenever it changes (after hydration).
 *
 * @param key - The localStorage key
 * @param value - The state value to persist
 * @param isHydrated - Whether the app has finished hydration
 * @param serialize - Optional custom serializer (defaults to JSON.stringify for objects, .toString() for primitives)
 */
export function usePersistedState<T>(
  key: string,
  value: T,
  isHydrated: boolean,
  serialize?: (v: T) => string
): void {
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    const serialized = serialize
      ? serialize(value)
      : typeof value === "string"
        ? value
        : typeof value === "number"
          ? value.toString()
          : JSON.stringify(value);

    localStorage.setItem(key, serialized);
  }, [key, value, isHydrated, serialize]);
}
