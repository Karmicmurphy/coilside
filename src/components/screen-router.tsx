"use client";

// Thin router abstraction — wraps the nav store so child components don't import it directly.
import { useNav, type Screen } from "@/lib/nav";

export function useRouter() {
  const go = useNav((s) => s.go);
  const back = useNav((s) => s.back);
  const home = useNav((s) => s.home);
  return {
    current: useNav((s) => s.current),
    contextId: useNav((s) => s.contextId),
    go: (screen: Screen, opts?: { contextId?: string; reset?: boolean }) =>
      go(screen, opts),
    back,
    home,
  };
}
