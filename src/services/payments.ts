/**
 * Payments Service
 * Handles credit purchases, course purchases, and Stripe integration
 */

import API from "@/lib/api";

export interface CreditBalance {
  balance: number;
  userId: string;
  expiresAt?: string | null;
  expiresInDays?: number | null;
}

export interface Transaction {
  id: string;
  userId: string;
  type: string; // 'purchase', 'usage', 'refund', 'bonus'
  amount: number;
  description: string;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

export type PaymentMethod = "card" | "boleto";

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  creditsAmount?: number;
  courseId?: string;
  paymentMethod?: PaymentMethod;
  platformFee?: number;
  creatorAmount?: number;
  payoutStatus?: "split" | "pending_onboarding";
  // Boleto specific data
  boletoUrl?: string;
  boletoNumber?: string;
  boletoExpiresAt?: number;
}

export interface PaymentIntentResult {
  paymentIntent?: PaymentIntent;
  error?: string;
  code?: string;
}

export interface SetupIntentResult {
  clientSecret?: string;
  setupIntentId?: string;
  error?: string;
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(): Promise<CreditBalance | null> {
  const response = await API<CreditBalance>("credits/balance");
  if (response.error || !response.data) {
    console.error("Error getting credit balance:", response.errorUserMessage);
    return null;
  }
  return response.data;
}

/**
 * Get user's transaction history
 */
export async function getTransactions(): Promise<Transaction[]> {
  const response = await API<Transaction[]>("credits/transactions");
  if (response.error || !response.data) {
    console.error("Error getting transactions:", response.errorUserMessage);
    return [];
  }
  return response.data;
}

/**
 * Create payment intent for purchasing credits
 * @param paymentMethod - "card" or "boleto"
 */
export async function createCreditsPaymentIntent(
  amount: number,
  creditsAmount: number,
  paymentMethod: PaymentMethod = "card"
): Promise<PaymentIntentResult> {
  const response = await API<PaymentIntent>("payments/credits/create-intent", {
    method: "POST",
    data: { amount, creditsAmount, paymentMethod },
  });
  if (response.error || !response.data) {
    console.error("Error creating payment intent:", response.errorUserMessage);
    return {
      error: response.errorUserMessage || "Erro ao criar intenção de pagamento",
      code: response.errorCode,
    };
  }
  return { paymentIntent: response.data };
}

/**
 * Create payment intent for purchasing a course
 * @param paymentMethod - "card" or "boleto"
 */
export async function createCoursePaymentIntent(
  courseId: string,
  paymentMethod: PaymentMethod = "card"
): Promise<PaymentIntentResult> {
  const response = await API<PaymentIntent>("payments/course/create-intent", {
    method: "POST",
    data: { courseId, paymentMethod },
  });
  if (response.error || !response.data) {
    console.error(
      "Error creating course payment intent:",
      response.errorUserMessage
    );
    return {
      error: response.errorUserMessage || "Erro ao criar intenção de pagamento",
      code: response.errorCode,
    };
  }
  return { paymentIntent: response.data };
}

/**
 * Create a setup intent to save a card
 */
export async function createCardSetupIntent(): Promise<SetupIntentResult> {
  const response = await API<{ clientSecret: string; setupIntentId: string }>(
    "payments/cards/setup-intent",
    { method: "POST" }
  );
  if (response.error || !response.data) {
    console.error("Error creating setup intent:", response.errorUserMessage);
    return {
      error: response.errorUserMessage || "Erro ao iniciar cadastro de cartão",
    };
  }
  return {
    clientSecret: response.data.clientSecret,
    setupIntentId: response.data.setupIntentId,
  };
}

/**
 * Confirm payment after Stripe processes it
 */
export async function confirmPayment(
  paymentIntentId: string
): Promise<{ success: boolean; status: string } | null> {
  const response = await API<{ success: boolean; status: string }>(
    "payments/confirm",
    {
      method: "POST",
      data: { paymentIntentId },
    }
  );
  if (response.error || !response.data) {
    console.error("Error confirming payment:", response.errorUserMessage);
    return null;
  }
  return response.data;
}

/**
 * Calculate video upload cost based on duration
 * Cost: 1 credit per minute
 */
export function calculateVideoUploadCost(durationInSeconds: number): number {
  const minutes = Math.ceil(durationInSeconds / 60);
  return minutes; // 1 credit per minute
}

/**
 * Calculate quiz generation cost
 * 1 crédito a cada 5 perguntas (1-5 => 1, 6-10 => 2)
 */
export function calculateQuizGenerationCost(numQuestions: number = 5): number {
  return Math.max(1, Math.ceil(numQuestions / 5));
}
