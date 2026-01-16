/**
 * Creator Terms Service (Frontend)
 * Handles creator terms acceptance flow.
 */

import api from "@/lib/api";

export interface CreatorTermsStatus {
  version: string;
  title: string;
  items: string[];
  accepted: boolean;
  acceptedAt?: string | null;
}

/**
 * Get creator terms and acceptance status.
 */
export async function getCreatorTermsStatus(): Promise<CreatorTermsStatus | null> {
  const response = await api<CreatorTermsStatus>("payments/creator-terms");

  if (response.error || !response.data) {
    console.error("Error getting creator terms:", response.errorUserMessage);
    return null;
  }

  return response.data;
}

/**
 * Accept creator terms.
 */
export async function acceptCreatorTerms(
  version: string
): Promise<{ accepted: boolean; version: string; acceptedAt?: string } | { error: string }> {
  const response = await api<{ accepted: boolean; version: string; acceptedAt?: string }>(
    "payments/creator-terms/accept",
    {
      method: "POST",
      data: { version },
    }
  );

  if (response.error || !response.data) {
    return { error: response.errorUserMessage || "Erro ao aceitar termos" };
  }

  return response.data;
}
