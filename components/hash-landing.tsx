"use client";

import { useEffect } from "react";

export function HashLanding({ id }: { id: string }) {
  useEffect(() => {
    function land() {
      if (window.location.hash !== `#${id}`) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    }
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, [id]);

  return null;
}
