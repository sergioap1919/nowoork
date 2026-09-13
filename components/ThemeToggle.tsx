"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nowoork-theme");
    const initial = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
    document.documentElement.dataset.theme = initial ? "dark" : "light";
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("nowoork-theme", next ? "dark" : "light");
  }

  return (
    <button className="iconButton" onClick={toggle} aria-label="Cambiar tema" title="Cambiar tema">
      {dark ? "☀" : "☾"}
    </button>
  );
}
