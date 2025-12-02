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

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  creditsAmount?: number;
  courseId?: string;
}

/**
 * Get user's credit balance
 */
export async function getCreditBalance(): Promise<CreditBalance | null> {
  try {
    const response = await API<CreditBalance>("/credits/balance", {
      method: "GET",
    });

    if (response.error || !response.data) {
      console.error("Error getting credit balance:", response.errorUserMessage);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error getting credit balance:", error);
    return null;
  }
}

/**
 * Get user's transaction history
 */
export async function getTransactions(): Promise<Transaction[]> {
  try {
    const response = await API<Transaction[]>("/credits/transactions", {
      method: "GET",
    });

    if (response.error || !response.data) {
      console.error("Error getting transactions:", response.errorUserMessage);
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
}

/**
 * Create payment intent for purchasing credits
 */
export async function createCreditsPaymentIntent(
  amount: number,
  creditsAmount: number
): Promise<PaymentIntent | null> {
  try {
    const response = await API<PaymentIntent>(
      "/payments/credits/create-intent",
      {
        method: "POST",
        data: {
          amount,
          creditsAmount,
        },
      }
    );

    if (response.error || !response.data) {
      console.error(
        "Error creating payment intent:",
        response.errorUserMessage
      );
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return null;
  }
}

/**
 * Create payment intent for purchasing a course
 */
export async function createCoursePaymentIntent(
  courseId: string,
  amount: number
): Promise<PaymentIntent | null> {
  try {
    const response = await API<PaymentIntent>(
      "/payments/course/create-intent",
      {
        method: "POST",
        data: {
          courseId,
          amount,
        },
      }
    );

    if (response.error || !response.data) {
      console.error(
        "Error creating course payment intent:",
        response.errorUserMessage
      );
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error creating course payment intent:", error);
    return null;
  }
}

/**
 * Confirm payment after Stripe processes it
 */
export async function confirmPayment(
  paymentIntentId: string
): Promise<{ success: boolean; status: string } | null> {
  try {
    const response = await API<{ success: boolean; status: string }>(
      "/payments/confirm",
      {
        method: "POST",
        data: {
          paymentIntentId,
        },
      }
    );

    if (response.error || !response.data) {
      console.error("Error confirming payment:", response.errorUserMessage);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error confirming payment:", error);
    return null;
  }
}

/**
 * Purchase course with credits
 */
export async function purchaseCourseWithCredits(
  courseId: string
): Promise<{ success: boolean; message?: string } | null> {
  try {
    const response = await API<{ success: boolean; message?: string }>(
      "/payments/course/purchase-with-credits",
      {
        method: "POST",
        data: {
          courseId,
        },
      }
    );

    if (response.error || !response.data) {
      console.error(
        "Error purchasing course with credits:",
        response.errorUserMessage
      );
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error purchasing course with credits:", error);
    return null;
  }
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
