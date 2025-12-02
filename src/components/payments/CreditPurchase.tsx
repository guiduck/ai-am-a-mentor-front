"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createCreditsPaymentIntent, confirmPayment } from "@/services/payments";
import { Button } from "@/components/ui/Button/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import styles from "./CreditPurchase.module.css";

interface CreditPackage {
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 10, price: 10 },
  { credits: 50, price: 45, bonus: 5, popular: true },
  { credits: 100, price: 80, bonus: 20 },
  { credits: 500, price: 350, bonus: 150 },
];

interface CheckoutFormProps {
  clientSecret: string;
  creditsAmount: number;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

function CheckoutForm({ clientSecret, creditsAmount, amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Erro ao processar pagamento");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm payment on backend
        await confirmPayment(paymentIntent.id);
        onSuccess();
      }
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao processar pagamento");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.checkoutForm}>
      <div className={styles.summary}>
        <p><strong>{creditsAmount} créditos</strong></p>
        <p className={styles.price}>R$ {amount.toFixed(2)}</p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className={styles.error}>{errorMessage}</div>
      )}

      <div className={styles.actions}>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? "Processando..." : `Pagar R$ ${amount.toFixed(2)}`}
        </Button>
      </div>
    </form>
  );
}

interface CreditPurchaseProps {
  onPurchaseComplete: () => void;
}

export default function CreditPurchase({ onPurchaseComplete }: CreditPurchaseProps) {
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPackage = async (pkg: CreditPackage) => {
    setIsLoading(true);
    setSelectedPackage(pkg);

    try {
      const totalCredits = pkg.credits + (pkg.bonus || 0);
      const paymentIntent = await createCreditsPaymentIntent(pkg.price, totalCredits);

      if (paymentIntent && paymentIntent.clientSecret) {
        setClientSecret(paymentIntent.clientSecret);
      } else {
        alert("Erro ao criar intenção de pagamento");
        setSelectedPackage(null);
      }
    } catch (error) {
      console.error("Error creating payment intent:", error);
      alert("Erro ao criar intenção de pagamento");
      setSelectedPackage(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedPackage(null);
    setClientSecret(null);
  };

  const handleSuccess = () => {
    setSelectedPackage(null);
    setClientSecret(null);
    onPurchaseComplete();
  };

  if (clientSecret && selectedPackage) {
    const stripePromise = getStripe();

    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>💳 Finalizar Compra</CardTitle>
        </CardHeader>
        <CardContent>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm
              clientSecret={clientSecret}
              creditsAmount={selectedPackage.credits + (selectedPackage.bonus || 0)}
              amount={selectedPackage.price}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>💰 Comprar Créditos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={styles.description}>
          Escolha um pacote de créditos para usar na plataforma
        </p>

        <div className={styles.packages}>
          {CREDIT_PACKAGES.map((pkg, index) => (
            <div
              key={index}
              className={`${styles.package} ${pkg.popular ? styles.popular : ""}`}
            >
              {pkg.popular && <div className={styles.badge}>Mais Popular</div>}
              
              <div className={styles.packageHeader}>
                <h3>{pkg.credits} créditos</h3>
                {pkg.bonus && (
                  <span className={styles.bonus}>+{pkg.bonus} bônus</span>
                )}
              </div>

              <div className={styles.packagePrice}>
                <span className={styles.currency}>R$</span>
                <span className={styles.amount}>{pkg.price}</span>
              </div>

              {pkg.bonus && (
                <p className={styles.total}>
                  Total: {pkg.credits + pkg.bonus} créditos
                </p>
              )}

              <Button
                variant={pkg.popular ? "primary" : "secondary"}
                onClick={() => handleSelectPackage(pkg)}
                disabled={isLoading}
                fullWidth
              >
                {isLoading && selectedPackage === pkg ? "Carregando..." : "Comprar"}
              </Button>
            </div>
          ))}
        </div>

        <div className={styles.info}>
          <p><strong>O que você pode fazer com créditos:</strong></p>
          <ul>
            <li>Upload de vídeos (1 crédito por minuto)</li>
            <li>Gerar quizzes com IA (5 créditos por quiz)</li>
            <li>Comprar cursos (varia por curso)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

