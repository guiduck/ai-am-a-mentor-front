"use client";

import { useEffect } from "react";

const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;

export function SessionTimeoutWatcher() {
  useEffect(() => {
    const logoutTimer = window.setTimeout(() => {
      window.location.href = "/logout?reason=expired";
    }, EIGHT_HOURS_IN_MS);

    return () => window.clearTimeout(logoutTimer);
  }, []);

  return null;
}
