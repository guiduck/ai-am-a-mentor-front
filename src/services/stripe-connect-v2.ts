/**
 * Stripe Connect V2 Service (Frontend)
 */

import API from "@/lib/api";

export interface ConnectV2Status {
  hasAccount: boolean;
  accountId?: string | null;
  readyToProcessPayments: boolean;
  requirementsStatus: string | null;
  onboardingComplete: boolean;
  error?: string;
}

export interface StripePrice {
  id: string;
  unit_amount: number | null;
  currency: string;
}

export interface StripeProduct {
  id: string;
  name: string;
  description?: string | null;
  default_price?: StripePrice | null;
}

export async function createConnectAccountV2(): Promise<{
  accountId?: string;
  error?: string;
}> {
  const response = await API<{ accountId: string }>("connect/v2/create-account", {
    method: "POST",
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar conta" };
  }

  return { accountId: response.data?.accountId };
}

export async function getConnectStatusV2(): Promise<ConnectV2Status> {
  const response = await API<ConnectV2Status>("connect/v2/status");
  if (response.error || !response.data) {
    return {
      hasAccount: false,
      accountId: null,
      readyToProcessPayments: false,
      requirementsStatus: null,
      onboardingComplete: false,
      error: response.errorUserMessage,
    };
  }
  return response.data;
}

export async function getOnboardingLinkV2(
  returnUrl: string,
  refreshUrl: string
): Promise<{ url?: string; error?: string }> {
  const response = await API<{ url: string }>("connect/v2/onboarding-link", {
    method: "POST",
    data: { returnUrl, refreshUrl },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao gerar link" };
  }

  return { url: response.data?.url };
}

export async function createProductV2(input: {
  name: string;
  description?: string;
  priceInCents: number;
  currency: string;
}): Promise<{ product?: StripeProduct; error?: string }> {
  const response = await API<{ product: StripeProduct }>("connect/v2/products", {
    method: "POST",
    data: input,
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar produto" };
  }

  return { product: response.data?.product };
}

export async function listProductsV2(): Promise<StripeProduct[]> {
  const response = await API<{ products: { data: StripeProduct[] } }>(
    "connect/v2/products"
  );
  if (response.error || !response.data) {
    return [];
  }
  return response.data.products.data || [];
}

export async function listStorefrontProducts(accountId: string): Promise<StripeProduct[]> {
  const response = await API<{ products: { data: StripeProduct[] } }>(
    `connect/v2/storefront/${accountId}/products`,
    { skipAuthRedirect: true }
  );
  if (response.error || !response.data) {
    return [];
  }
  return response.data.products.data || [];
}

export async function createStorefrontCheckout(input: {
  accountId: string;
  priceId: string;
  quantity?: number;
  productId?: string;
}): Promise<{ url?: string; error?: string }> {
  const response = await API<{ url: string }>("connect/v2/storefront/checkout", {
    method: "POST",
    data: input,
    skipAuthRedirect: true,
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar checkout" };
  }

  return { url: response.data?.url };
}

export async function createSubscriptionCheckoutV2(): Promise<{
  url?: string;
  error?: string;
}> {
  const response = await API<{ url: string }>("connect/v2/subscriptions/checkout", {
    method: "POST",
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao criar assinatura" };
  }

  return { url: response.data?.url };
}

export async function openBillingPortalV2(): Promise<{
  url?: string;
  error?: string;
}> {
  const response = await API<{ url: string }>("connect/v2/billing-portal", {
    method: "POST",
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao abrir portal" };
  }

  return { url: response.data?.url };
}
