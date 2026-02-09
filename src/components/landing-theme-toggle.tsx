"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Botão flutuante para alternar tema na landing page (light/dark).
 * Não persiste em perfil; apenas UX local (next-themes usa localStorage).
 */
export function LandingThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // This gates theme-dependent UI until after mount to avoid hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  function toggle() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={!mounted ? "Alternar tema" : resolvedTheme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
      className="landing-theme-toggle fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg transition-all hover:scale-110 hover:border-orange-500/50 hover:shadow-orange-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-500/50 dark:hover:shadow-orange-500/20"
    >
      {!mounted ? (
        <span className="h-5 w-5" aria-hidden />
      ) : resolvedTheme === "dark" ? (
        <Sun className="h-5 w-5 transition-transform" />
      ) : (
        <Moon className="h-5 w-5 transition-transform" />
      )}
    </button>
  );
}
