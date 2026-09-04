// Centered, persistent notice dialog. The message stays on screen until
// the user explicitly dismisses it, so they have time to read and understand it.

export type NoticeAction = {
  label: string;
  /** Visual weight: "primary" fills with the variant tone, "outline" is secondary. */
  style?: "primary" | "outline";
  onClick: () => void | Promise<void>;
};

export type NoticeOptions = {
  title?: string;
  message: string;
  description?: string;
  dismissLabel?: string;
  variant?: "error" | "warning" | "info" | "success";
  /** Extra explicit choices rendered next to the dismiss button. */
  actions?: NoticeAction[];
  /** Hide the plain dismiss button (only when actions cover every path). */
  hideDismiss?: boolean;
};

export const NOTICE_EVENT = "sh:notice-dialog";

export function noticeToast(opts: NoticeOptions) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NoticeOptions>(NOTICE_EVENT, { detail: opts }));
}

export const showNotice = noticeToast;
