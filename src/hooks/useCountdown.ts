import { useEffect, useState } from "react";

export function useCountdown(expiresAt: number | null) {
  const [msLeft, setMsLeft] = useState(() => (expiresAt ? Math.max(0, expiresAt - Date.now()) : 0));

  useEffect(() => {
    if (!expiresAt) {
      setMsLeft(0);
      return;
    }
    const update = () => setMsLeft(Math.max(0, expiresAt - Date.now()));
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return msLeft;
}
