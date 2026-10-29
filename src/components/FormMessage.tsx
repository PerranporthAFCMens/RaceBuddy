import type { ActionState } from "@/lib/types";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="border border-danger px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="border border-ok px-3 py-2 text-sm text-ok">
        {state.message}
      </p>
    );
  return null;
}
