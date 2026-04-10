"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type FlashToastProps = {
  notice?: string;
  error?: string;
};

export function FlashToast({ notice, error }: FlashToastProps) {
  const lastNotice = useRef<string | null>(null);
  const lastError = useRef<string | null>(null);

  useEffect(() => {
    if (notice && notice !== lastNotice.current) {
      toast.success(notice);
      lastNotice.current = notice;
    }
  }, [notice]);

  useEffect(() => {
    if (error && error !== lastError.current) {
      toast.error(error);
      lastError.current = error;
    }
  }, [error]);

  return null;
}

