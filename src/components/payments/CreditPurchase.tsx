"use client";

import { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createCreditsPaymentIntent, confirmPayment, PaymentMethod } from "@/services/payments";
import { Button } from "@/components/ui/Button/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import styles from "./CreditPurchase.module.css";

interface CreditPackage {
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

// Pacotes iniciais (MVP)
const CREDIT_PACKAGES: CreditPackage[] = [
  { credits: 20, price: 29 },
  { credits: 50, price: 59, popular: true },
  { credits: 120, price: 129 },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "card", label: "Cartão de Crédito", icon: "💳" },
  { id: "boleto", label: "Boleto Bancário", icon: "📄" },
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [boletoData, setBoletoData] = useState<{ url?: string; number?: string; expiresAt?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPackage = async (pkg: CreditPackage) => {
    setIsLoading(true);
    setSelectedPackage(pkg);
    setBoletoData(null);

    try {
      const totalCredits = pkg.credits + (pkg.bonus || 0);
      const paymentIntent = await createCreditsPaymentIntent(pkg.price, totalCredits, selectedPaymentMethod);

      if (paymentIntent && paymentIntent.clientSecret) {
        setClientSecret(paymentIntent.clientSecret);
        
        // If boleto, save boleto data
        if (selectedPaymentMethod === "boleto" && paymentIntent.boletoUrl) {
          setBoletoData({
            url: paymentIntent.boletoUrl,
            number: paymentIntent.boletoNumber,
            expiresAt: paymentIntent.boletoExpiresAt,
          });
        }
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
    setBoletoData(null);
  };

  const handleSuccess = () => {
    setSelectedPackage(null);
    setClientSecret(null);
    setBoletoData(null);
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

        {/* Payment Method Selection */}
        <div className={styles.paymentMethodSection}>
          <p className={styles.sectionTitle}>Forma de pagamento:</p>
          <div className={styles.paymentMethods}>
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                type="button"
                className={`${styles.paymentMethodButton} ${selectedPaymentMethod === method.id ? styles.selected : ""}`}
                onClick={() => setSelectedPaymentMethod(method.id)}
              >
                <span className={styles.methodIcon}>{method.icon}</span>
                <span>{method.label}</span>
              </button>
            ))}
          </div>
          {selectedPaymentMethod === "boleto" && (
            <p className={styles.boletoNote}>
              ⏰ Boletos vencem em 3 dias úteis. Créditos são liberados após
              confirmação do pagamento.
            </p>
          )}
        </div>

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
          <p>
            <strong>Créditos são usados para recursos de IA:</strong>
          </p>
          <ul>
            <li>💬 Perguntas ao mentor IA (custo por pergunta)</li>
            <li>🤖 Gerar quizzes automáticos (5 créditos por quiz)</li>
          </ul>
          <p className={styles.note}>
            📌 Cursos são comprados diretamente com cartão ou boleto
          </p>
        </div>
      </CardContent>
    </Card>
  );
}




