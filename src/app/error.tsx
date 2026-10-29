"use client";
import { useEffect } from "react";
import { Oops } from "@/components/Oops";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Oops
      title="Something went wrong"
      body="That didn't load. Check your signal and try again. If it keeps happening, go back to Browse."
      retry={retry}
    />
  );
}
