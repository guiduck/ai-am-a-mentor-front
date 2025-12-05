"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import CreditPurchase from "@/components/payments/CreditPurchase";
import CreatorBankSetup from "@/components/payments/CreatorBankSetup";
import { getCreditBalance, getTransactions } from "@/services/payments";
import type { CreditBalance, Transaction } from "@/services/payments";
import styles from "./page.module.css";

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [balanceData, transactionsData] = await Promise.all([
      getCreditBalance(),
      getTransactions(),
    ]);

    if (balanceData) setBalance(balanceData);
    if (transactionsData) setTransactions(transactionsData);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePurchaseComplete = () => {
    loadData();
  };

  if (isLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1>Pagamentos</h1>
          <p>Gerencie seus créditos e transações</p>
        </div>

        <div className={styles.content}>
          {/* Credit Balance */}
          <Card variant="elevated" className={styles.balanceCard}>
            <CardHeader>
              <CardTitle>💰 Seu Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.balance}>
                <span className={styles.balanceAmount}>{balance?.balance || 0}</span>
                <span className={styles.balanceLabel}>créditos disponíveis</span>
              </div>
              <div className={styles.balanceInfo}>
                <p><strong>Créditos são usados apenas para recursos de IA:</strong></p>
                <ul>
                  {user?.role === "creator" ? (
                    <li>🤖 Gerar quiz automático com IA: ~50 créditos</li>
                  ) : (
                    <li>💬 Fazer perguntas ao mentor IA: ~10 créditos por pergunta</li>
                  )}
                </ul>
                <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", opacity: 0.8 }}>
                  💡 1000 créditos = R$ 10,00 (proporcional ao uso de IA)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Credits */}
          <CreditPurchase onPurchaseComplete={handlePurchaseComplete} />

          {/* Transaction History */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📊 Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className={styles.emptyState}>Nenhuma transação ainda</p>
              ) : (
                <div className={styles.transactions}>
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className={styles.transaction}>
                      <div className={styles.transactionInfo}>
                        <span className={styles.transactionType}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        <span className={styles.transactionDescription}>
                          {transaction.description}
                        </span>
                        <span className={styles.transactionDate}>
                          {new Date(transaction.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`${styles.transactionAmount} ${
                          transaction.amount > 0 ? styles.positive : styles.negative
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}
                        {transaction.amount} créditos
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Setup for Creators */}
          {user?.role === "creator" && (
            <CreatorBankSetup />
          )}

          {/* Info for Students */}
          {user?.role === "student" && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>📚 Como Funciona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.creatorInfo}>
                  <p><strong>Cursos:</strong> Comprados com cartão de crédito ou boleto</p>
                  <p><strong>Créditos:</strong> Usados apenas para perguntas ao mentor IA</p>
                  <p className={styles.note}>
                    💡 <strong>Dica:</strong> Use o mentor IA para tirar dúvidas sobre as aulas!
                    Cada pergunta custa aproximadamente 10 créditos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    purchase: "💳 Compra",
    usage: "📤 Uso",
    refund: "↩️ Reembolso",
    bonus: "🎁 Bônus",
  };
  return labels[type] || type;
}


