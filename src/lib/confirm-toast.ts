// Centered confirmation dialog. Keeps the historical name `confirmToast`
// for backward compatibility, but renders a large modal in the middle of
// the screen instead of a toast.

export type ConfirmOptions = {
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel?: () => void;
};

export const CONFIRM_EVENT = "sh:confirm-dialog";

export function confirmToast(opts: ConfirmOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ConfirmOptions>(CONFIRM_EVENT, { detail: opts }));
}

export const confirmDialog = confirmToast;
