/**
 * Payments Service
 * Handles credit purchases, course purchases, and Stripe integration
 */

import API from "@/lib/api";

export interface CreditBalance {
  balance: number;
  userId: string;
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
  // Boleto specific data
  boletoUrl?: string;
  boletoNumber?: string;
  boletoExpiresAt?: number;
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
): Promise<PaymentIntent | null> {
  const response = await API<PaymentIntent>("payments/credits/create-intent", {
    method: "POST",
    data: { amount, creditsAmount, paymentMethod },
  });
  if (response.error || !response.data) {
    console.error("Error creating payment intent:", response.errorUserMessage);
    return null;
  }
  return response.data;
}

/**
 * Create payment intent for purchasing a course
 * @param paymentMethod - "card" or "boleto"
 */
export async function createCoursePaymentIntent(
  courseId: string,
  amount: number,
  paymentMethod: PaymentMethod = "card"
): Promise<PaymentIntent | null> {
  const response = await API<PaymentIntent>("payments/course/create-intent", {
    method: "POST",
    data: { courseId, amount, paymentMethod },
  });
  if (response.error || !response.data) {
    console.error("Error creating course payment intent:", response.errorUserMessage);
    return null;
  }
  return response.data;
}

/**
 * Confirm payment after Stripe processes it
 */
export async function confirmPayment(
  paymentIntentId: string
): Promise<{ success: boolean; status: string } | null> {
  const response = await API<{ success: boolean; status: string }>("payments/confirm", {
    method: "POST",
    data: { paymentIntentId },
  });
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
 * Fixed cost: 5 credits per quiz
 */
export function calculateQuizGenerationCost(): number {
  return 5;
}
