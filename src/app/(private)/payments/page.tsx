"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import CreatorBankSetup from "@/components/payments/CreatorBankSetup";
import CreditPurchase from "@/components/payments/CreditPurchase";
import {
  getCreditBalance,
  getTransactions,
  type CreditBalance,
  type Transaction,
} from "@/services/payments";
import {
  getSubscriptionPlans,
  getUserSubscription,
  createSubscriptionCheckout,
  subscribeToFreePlan,
  cancelSubscription,
  formatPlanPrice,
  getFeatureLabel,
  type SubscriptionPlan,
  type UserSubscription,
  type UsageStatus,
} from "@/services/subscriptions";
import styles from "./page.module.css";
import InfoCard from "./_components/InfoCard";

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const transactionsPageSize = 10;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(
    null
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsHasMore, setTransactionsHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansData, subscriptionData, transactionsData] = await Promise.all([
        getSubscriptionPlans(user?.role as "creator" | "student"),
        getUserSubscription(),
        getTransactions(1, transactionsPageSize),
      ]);

      const shouldRefreshSubscriptionCredits =
        !!subscriptionData.subscription &&
        parseFloat(subscriptionData.subscription.plan.price) > 0 &&
        subscriptionData.subscription.plan.features.support !== "community";

      const creditBalanceData = await getCreditBalance({
        refreshSubscriptionCredits: shouldRefreshSubscriptionCredits,
      });

      setPlans(plansData);
      setSubscription(subscriptionData.subscription);
      setUsage(subscriptionData.usage);
      setCreditBalance(creditBalanceData);
      setTransactions(transactionsData.items);
      setTransactionsPage(transactionsData.page);
      setTransactionsHasMore(transactionsData.hasMore);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    setIsSubscribing(plan.id);
    try {
      const price = parseFloat(plan.price);

      if (price === 0) {
        // Free plan
        const result = await subscribeToFreePlan();
        if ("error" in result) {
          alert(result.error);
        } else {
          alert(result.message);
          loadData();
        }
      } else {
        // Paid plan - redirect to Stripe
        const result = await createSubscriptionCheckout(plan.id);
        if ("error" in result) {
          alert(result.error);
        } else {
          window.location.href = result.sessionUrl;
        }
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      alert("Erro ao processar assinatura");
    }
    setIsSubscribing(null);
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      const result = await cancelSubscription(false);
      if ("error" in result) {
        alert(result.error);
      } else {
        alert(result.message);
        loadData();
      }
    } catch (error) {
      console.error("Error cancelling:", error);
      alert("Erro ao cancelar assinatura");
    }
    setIsCancelling(false);
  };

  if (isLoading) {
    return <FullPageLoading />;
  }

  const isCreator = user?.role === "creator";

  const creditsLimit = usage?.creditsLimit ?? null;
  const creditsUsed =
    usage?.creditsUsed ??
    (creditsLimit !== null && usage?.creditsRemaining !== undefined
      ? Math.max(creditsLimit - (usage?.creditsRemaining ?? 0), 0)
      : null);
  const creditsRemaining =
    usage?.creditsRemaining ??
    (creditsLimit !== null && usage?.creditsUsed !== undefined
      ? Math.max(creditsLimit - (usage?.creditsUsed ?? 0), 0)
      : null);
  const loadMoreTransactions = async () => {
    if (isLoadingMore || !transactionsHasMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = transactionsPage + 1;
      const response = await getTransactions(nextPage, transactionsPageSize);
      setTransactions((prev) => [...prev, ...response.items]);
      setTransactionsPage(response.page);
      setTransactionsHasMore(response.hasMore);
    } catch (error) {
      console.error("Error loading more transactions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: "Compra de créditos",
      usage: "Uso de créditos",
      refund: "Estorno",
      bonus: "Bônus",
      subscription_credit: "Créditos de assinatura",
      expiration: "Expiração",
    };

    return labels[type] || "Transação";
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1>Assinatura</h1>
          <p>
            {isCreator
              ? "Gerencie sua assinatura e acompanhe seu uso"
              : "Escolha o plano ideal para seu aprendizado"}
          </p>
        </div>
        {/* Current Subscription */}
        <Card variant="elevated" className={styles.currentPlanCard}>
          <CardHeader>
            <CardTitle>📋 Seu Plano Atual</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className={styles.currentPlan}>
                <div className={styles.planInfo}>
                  <span className={styles.planBadge}>
                    {subscription.plan.displayName}
                  </span>
                  <span className={styles.planPrice}>
                    {formatPlanPrice(subscription.plan)}
                  </span>
                  {subscription.currentPeriodEnd && (
                    <span className={styles.periodInfo}>
                      {subscription.cancelAtPeriodEnd
                        ? "Cancela em: "
                        : "Renova em: "}
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                {parseFloat(subscription.plan.price) > 0 &&
                  !subscription.cancelAtPeriodEnd && (
                    <Button
                      variant="outline"
                      onClick={handleCancelSubscription}
                      loading={isCancelling}
                    >
                      Cancelar Assinatura
                    </Button>
                  )}
              </div>
            ) : (
              <div className={styles.noPlan}>
                <p>Você ainda não possui uma assinatura.</p>
                <p>Escolha um plano abaixo para começar!</p>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Usage Stats */}
        {usage && subscription && (
          <Card variant="elevated" className={styles.usageCard}>
            <CardHeader>
              <CardTitle>📊 Seu Uso Este Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.usageGrid}>
                {isCreator ? (
                  <>
                    <UsageItem
                      label="Cursos Criados"
                      current={usage.coursesCreated}
                      limit={usage.limits?.courses ?? usage.coursesLimit ?? 0}
                    />
                    <UsageItem
                      label="Vídeos Enviados"
                      current={usage.videosUploaded}
                      limit={usage.limits?.videos ?? usage.videosLimit ?? 0}
                    />
                    <UsageItem
                      label="Quizzes Gerados"
                      current={usage.quizzesGenerated}
                      limit={
                        usage.limits?.quizzes_per_month ??
                        usage.quizzesLimit ??
                        0
                      }
                    />
                  </>
                ) : (
                  <UsageItem
                    label="Perguntas IA Hoje"
                    current={usage.aiQuestionsAsked}
                    limit={
                      usage.limits?.ai_questions_per_day ??
                      usage.aiQuestionsLimit ??
                      0
                    }
                  />
                )}
              </div>
              <p className={styles.periodNote}>
                Período:{" "}
                {new Date(usage.periodStart).toLocaleDateString("pt-BR")} -{" "}
                {new Date(usage.periodEnd).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        )}
        {(creditBalance ||
          creditsLimit !== null ||
          creditsRemaining !== null) && (
          <Card variant="elevated" className={styles.creditsCard}>
            <CardHeader>
              <CardTitle>💳 Créditos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.creditsSummary}>
                <div className={styles.creditMetric}>
                  <span className={styles.usageLabel}>Saldo atual</span>
                  <span className={styles.creditValue}>
                    {creditBalance?.balance ?? 0}
                  </span>
                </div>
                {creditsRemaining !== null && (
                  <div className={styles.creditMetric}>
                    <span className={styles.usageLabel}>
                      Restantes no ciclo
                    </span>
                    <span className={styles.creditValue}>
                      {creditsRemaining}
                    </span>
                  </div>
                )}
              </div>
              {creditsLimit !== null && creditsUsed !== null && (
                <div className={styles.usageGrid}>
                  <UsageItem
                    label="Créditos usados"
                    current={creditsUsed}
                    limit={creditsLimit}
                  />
                </div>
              )}
              {creditBalance?.expiresAt && (
                <p className={styles.periodNote}>
                  Expiração em:{" "}
                  {new Date(creditBalance.expiresAt).toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <section className={styles.creditPurchaseSection}>
          <h2>Comprar créditos</h2>
          <CreditPurchase onPurchaseComplete={loadData} />
        </section>
        <Card variant="elevated" className={styles.transactionsCard}>
          <CardHeader>
            <CardTitle>📜 Histórico de créditos</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className={styles.transactionList}>
                {transactions.map((transaction) => {
                  const isPositive = transaction.amount > 0;
                  const amountLabel = `${isPositive ? "+" : ""}${transaction.amount}`;
                  return (
                    <div
                      key={transaction.id}
                      className={styles.transactionItem}
                    >
                      <div className={styles.transactionInfo}>
                        <span className={styles.transactionTitle}>
                          {transaction.description ||
                            getTransactionTypeLabel(transaction.type)}
                        </span>
                        <span className={styles.transactionMeta}>
                          {getTransactionTypeLabel(transaction.type)} ·{" "}
                          {new Date(transaction.createdAt).toLocaleString(
                            "pt-BR",
                            {
                              dateStyle: "short",
                              timeStyle: "short",
                            }
                          )}
                        </span>
                      </div>
                      <span
                        className={`${styles.transactionAmount} ${
                          isPositive
                            ? styles.transactionPositive
                            : styles.transactionNegative
                        }`}
                      >
                        {amountLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.transactionEmpty}>
                <p>Você ainda não possui movimentações de créditos.</p>
              </div>
            )}
            {transactionsHasMore && (
              <div className={styles.transactionsFooter}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={loadMoreTransactions}
                  loading={isLoadingMore}
                >
                  {isLoadingMore ? "Carregando..." : "Ver mais"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Available Plans */}
        <section className={styles.plansSection}>
          <h2>
            {isCreator ? "Planos para Professores" : "Planos para Estudantes"}
          </h2>
          <div className={styles.plansGrid}>
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const price = parseFloat(plan.price);

              return (
                <Card
                  key={plan.id}
                  variant="elevated"
                  className={`${styles.planCard} ${
                    isCurrentPlan ? styles.currentPlanHighlight : ""
                  }`}
                >
                  <CardContent>
                    {isCurrentPlan && (
                      <span className={styles.currentBadge}>PLANO ATUAL</span>
                    )}
                    <h3 className={styles.planName}>{plan.displayName}</h3>

                    <div className={styles.planPriceDisplay}>
                      {price === 0 ? (
                        <span className={styles.freeLabel}>Grátis</span>
                      ) : (
                        <>
                          <span className={styles.currency}>R$</span>
                          <span className={styles.amount}>
                            {price.toFixed(0)}
                          </span>
                          <span className={styles.period}>/mês</span>
                        </>
                      )}
                    </div>

                    <ul className={styles.featuresList}>
                      {Object.entries(plan.features).map(([key, value]) => {
                        if (plan.type === "creator" && key === "quizzes_per_month") {
                          return null;
                        }

                        if (plan.type === "student") {
                          const allowedKeys =
                            plan.name === "student_free"
                              ? new Set(["courses_access"])
                              : new Set(["ai_questions_per_day", "chat_with_teacher"]);
                          if (!allowedKeys.has(key)) {
                            return null;
                          }
                        }

                        const label = getFeatureLabel(key, value, plan.type);
                        if (!label) return null;
                        return <li key={key}>✓ {label}</li>;
                      })}
                    </ul>

                    <Button
                      variant={isCurrentPlan ? "outline" : "primary"}
                      fullWidth
                      disabled={isCurrentPlan}
                      loading={isSubscribing === plan.id}
                      onClick={() => handleSubscribe(plan)}
                    >
                      {isCurrentPlan
                        ? "Plano Atual"
                        : price === 0
                        ? "Começar Grátis"
                        : "Assinar Agora"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
        {/* Stripe Connect for Creators */}
        {isCreator && <CreatorBankSetup />}
        {/* Info Section */}
        <InfoCard isCreator={isCreator} />
      </div>
    </div>
  );
}

// Usage Item Component
function UsageItem({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number;
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

  return (
    <div className={styles.usageItem}>
      <span className={styles.usageLabel}>{label}</span>
      <div className={styles.usageValue}>
        <span className={styles.usageCurrent}>{current}</span>
        <span className={styles.usageLimit}>
          {isUnlimited ? " / ∞" : ` / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className={styles.usageBar}>
          <div
            className={styles.usageProgress}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
