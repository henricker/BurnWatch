"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

/**
 * Applies theme from profile once when dashboard loads. Does not run again
 * so it never overwrites the user's in-session theme selection.
 */
export function PreferencesSync({ theme }: { theme?: string | null }) {
  const { setTheme } = useTheme();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;
    const resolved = theme ?? "system";
    if (resolved) setTheme(resolved);
  }, [theme, setTheme]);

  return null;
}
