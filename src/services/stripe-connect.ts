/**
 * Stripe Connect Service (Frontend)
 * Handles creator payment account setup
 */

import api from "@/lib/api";

export interface ConnectAccountStatus {
  hasAccount: boolean;
  accountId?: string;
  isComplete: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  error?: string;
}

export interface ConnectBalance {
  available: number;
  pending: number;
  error?: string;
}

/**
 * Create a new Stripe Connect account for the creator
 */
export async function createConnectAccount(): Promise<{ accountId?: string; error?: string }> {
  const response = await api<{ accountId: string; message: string }>("connect/create-account", {
    method: "POST",
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar conta" };
  }

  return { accountId: response.data?.accountId };
}

/**
 * Get onboarding link to complete Stripe setup
 */
export async function getOnboardingLink(
  returnUrl: string,
  refreshUrl: string
): Promise<{ url?: string; error?: string }> {
  const response = await api<{ url: string }>("connect/onboarding-link", {
    method: "POST",
    data: { returnUrl, refreshUrl },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao gerar link de configuração" };
  }

  return { url: response.data?.url };
}

/**
 * Get current Connect account status
 */
export async function getConnectStatus(): Promise<ConnectAccountStatus> {
  const response = await api<ConnectAccountStatus>("connect/status");

  if (response.error) {
    return {
      hasAccount: false,
      isComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      error: response.errorUserMessage,
    };
  }

  return response.data || {
    hasAccount: false,
    isComplete: false,
    chargesEnabled: false,
    payoutsEnabled: false,
  };
}

/**
 * Get link to Stripe Express dashboard
 */
export async function getDashboardLink(): Promise<{ url?: string; error?: string }> {
  const response = await api<{ url: string }>("connect/dashboard-link");

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao gerar link do dashboard" };
  }

  return { url: response.data?.url };
}

/**
 * Get creator's current balance
 */
export async function getCreatorBalance(): Promise<ConnectBalance> {
  const response = await api<ConnectBalance>("connect/balance");

  if (response.error) {
    return {
      available: 0,
      pending: 0,
      error: response.errorUserMessage,
    };
  }

  return response.data || { available: 0, pending: 0 };
}

/**
 * Purchase course with payment split to creator
 */
export async function purchaseCourseWithSplit(
  courseId: string,
  paymentMethod: "card" | "boleto" = "card"
): Promise<{
  clientSecret?: string;
  paymentIntentId?: string;
  amount?: number;
  platformFee?: number;
  creatorAmount?: number;
  payoutStatus?: "split" | "pending_onboarding";
  error?: string;
}> {
  const response = await api<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    platformFee: number;
    creatorAmount: number;
    payoutStatus?: "split" | "pending_onboarding";
  }>("connect/purchase-course", {
    method: "POST",
    data: { courseId, paymentMethod },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar pagamento" };
  }

  return response.data || {};
}
