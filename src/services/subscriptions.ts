/**
 * Subscription Service
 * Handles subscription plans, user subscriptions, and usage tracking
 */

import API from "@/lib/api";

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  type: "creator" | "student";
  price: string;
  billingPeriod: string;
  features: {
    courses?: number; // -1 = unlimited
    videos?: number;
    quizzes_per_month?: number;
    commission_rate?: number;
    ai_questions_per_day?: number;
    support?: string;
    certificates?: boolean;
    courses_access?: string;
    progress_reports?: boolean;
  };
  isActive: number;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: "active" | "cancelled" | "past_due" | "trialing";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: number;
  createdAt: string;
}

export interface UsageStatus {
  periodStart: string;
  periodEnd: string;
  quizzesGenerated: number;
  aiQuestionsAsked: number;
  videosUploaded: number;
  coursesCreated: number;
  coursesLimit?: number;
  videosLimit?: number;
  quizzesLimit?: number;
  aiQuestionsLimit?: number;
  limits?: {
    courses: number;
    videos: number;
    quizzes_per_month: number;
    ai_questions_per_day: number;
  };
}

export interface CanPerformResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
}

// Get all subscription plans
export async function getSubscriptionPlans(
  type?: "creator" | "student"
): Promise<SubscriptionPlan[]> {
  const params = type ? `?type=${type}` : "";
  const response = await API<{ plans: SubscriptionPlan[] }>(
    `subscriptions/plans${params}`
  );

  if (response.data?.plans) {
    return response.data.plans.map((plan) => ({
      ...plan,
      features:
        typeof plan.features === "string"
          ? JSON.parse(plan.features)
          : plan.features,
    }));
  }

  return [];
}

// Get current user's subscription
export async function getUserSubscription(): Promise<{
  subscription: UserSubscription | null;
  usage: UsageStatus | null;
}> {
  const response = await API<{
    subscription: UserSubscription | null;
    usage: UsageStatus | null;
  }>("subscriptions/me");

  if (response.data) {
    return response.data;
  }

  return { subscription: null, usage: null };
}

// Check if user can perform action
export async function canPerformAction(
  action: "create_course" | "upload_video" | "generate_quiz" | "ask_ai"
): Promise<CanPerformResult> {
  const response = await API<CanPerformResult>(
    `subscriptions/can-perform/${action}`
  );

  if (response.data) {
    return response.data;
  }

  return { allowed: false, reason: "Erro ao verificar permissão" };
}

// Create checkout session for paid subscription
export async function createSubscriptionCheckout(
  planId: string
): Promise<{ sessionUrl: string } | { error: string }> {
  const response = await API<{ sessionUrl: string }>("subscriptions/checkout", {
    method: "POST",
    data: { planId },
  });

  if (response.data?.sessionUrl) {
    return { sessionUrl: response.data.sessionUrl };
  }

  return { error: response.errorUserMessage || "Erro ao criar checkout" };
}

// Subscribe to free plan
export async function subscribeToFreePlan(): Promise<
  { success: boolean; message: string } | { error: string }
> {
  const response = await API<{ success: boolean; message: string }>(
    "subscriptions/subscribe-free",
    {
      method: "POST",
    }
  );

  if (response.data?.success) {
    return response.data;
  }

  return { error: response.errorUserMessage || "Erro ao assinar plano gratuito" };
}

// Cancel subscription
export async function cancelSubscription(
  immediate: boolean = false
): Promise<{ success: boolean; message: string } | { error: string }> {
  const response = await API<{ success: boolean; message: string }>(
    "subscriptions/cancel",
    {
      method: "POST",
      data: { immediate },
    }
  );

  if (response.data?.success) {
    return response.data;
  }

  return { error: response.errorUserMessage || "Erro ao cancelar assinatura" };
}

// Helper to format plan price
export function formatPlanPrice(plan: SubscriptionPlan): string {
  const price = parseFloat(plan.price);
  if (price === 0) return "Grátis";
  return `R$ ${price.toFixed(2).replace(".", ",")}/mês`;
}

// Helper to get feature label
export function getFeatureLabel(
  key: string,
  value: number | string | boolean
): string {
  const labels: Record<string, (v: number | string | boolean) => string> = {
    courses: (v) => (v === -1 ? "Cursos ilimitados" : `Até ${v} cursos`),
    videos: (v) => (v === -1 ? "Vídeos ilimitados" : `Até ${v} vídeos`),
    quizzes_per_month: (v) =>
      v === -1 ? "Quizzes ilimitados" : v === 0 ? "Sem quizzes" : `${v} quizzes/mês`,
    ai_questions_per_day: (v) =>
      v === -1 ? "Perguntas IA ilimitadas" : v === 0 ? "Sem IA" : `${v} perguntas/dia`,
    commission_rate: (v) => `${((v as number) * 100).toFixed(0)}% taxa`,
    support: (v) =>
      v === "priority" ? "Suporte prioritário" : v === "email" ? "Suporte por email" : "Comunidade",
    certificates: (v) => (v ? "Certificados inclusos" : ""),
    courses_access: (v) => (v === "all" ? "Acesso a todos os cursos" : "Cursos comprados"),
    progress_reports: (v) => (v ? "Relatórios de progresso" : ""),
  };

  const formatter = labels[key];
  if (formatter) {
    const result = formatter(value);
    return result || "";
  }

  return "";
}
