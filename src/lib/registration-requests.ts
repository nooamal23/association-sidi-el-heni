// Client helpers for the registration-requests feature.

import { API_URL, HAS_API, apiFetch } from "./api";
import { normalizeTunisianPhone } from "./phone";

export type AgeCategory = "under_9" | "age_9_to_15" | "over_15";
export type RegistrationRequestStatus = "pending" | "approved" | "rejected";

export type RegistrationRequest = {
  id: string;
  fullName: string;
  ageCategory: AgeCategory;
  phone: string;
  status: RegistrationRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedById: string | null;
};

export const AGE_CATEGORY_LABEL: Record<AgeCategory, string> = {
  under_9: "أصغر من 9 سنوات",
  age_9_to_15: "بين 9 سنوات و15 سنة",
  over_15: "أكبر من 15 سنة",
};

// Public submission (no auth). Uses raw fetch to avoid attaching admin tokens.
export async function submitRegistrationRequest(input: {
  fullName: string;
  ageCategory: AgeCategory;
  phone: string;
}): Promise<void> {
  if (!HAS_API) {
    // Static/demo mode — pretend it worked so the UI stays browsable.
    return;
  }
  const res = await fetch(`${API_URL}/api/public/registration-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: input.fullName.trim(),
      ageCategory: input.ageCategory,
      phone: normalizeTunisianPhone(input.phone),
    }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    if (res.status === 429) {
      throw new Error("طلبات كثيرة جداً، يرجى المحاولة بعد قليل.");
    }
    throw new Error(msg);
  }
}

export async function listRegistrationRequests(
  status: RegistrationRequestStatus | "all" = "pending",
): Promise<RegistrationRequest[]> {
  if (!HAS_API) return [];
  return apiFetch<RegistrationRequest[]>(
    `/api/admin/registration-requests?status=${status}`,
  );
}

export async function resolveRegistrationRequest(
  id: string,
  action: "approve" | "reject",
): Promise<RegistrationRequest> {
  return apiFetch<RegistrationRequest>(
    `/api/admin/registration-requests/${id}/resolve`,
    { method: "POST", body: JSON.stringify({ action }) },
  );
}
