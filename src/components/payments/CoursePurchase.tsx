"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import {
  confirmPayment,
  createCoursePaymentIntent,
  PaymentMethod,
} from "@/services/payments";
import CardSetupModal from "@/components/payments/CardSetupModal";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import styles from "./CoursePurchase.module.css";

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "card", label: "Cartão de Crédito", icon: "💳" },
  { id: "boleto", label: "Boleto Bancário", icon: "📄" },
];

interface CheckoutFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Course checkout form using Stripe Payment Element.
 */
function CheckoutForm({ amount, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setInfoMessage(null);

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

      if (paymentIntent?.status === "succeeded") {
        await confirmPayment(paymentIntent.id);
        onSuccess();
        return;
      }

      setInfoMessage(
        "Pagamento em processamento. Você receberá acesso após a confirmação."
      );
      setIsProcessing(false);
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao processar pagamento");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.checkoutForm}>
      <div className={styles.summary}>
        <p>Curso selecionado</p>
        <p className={styles.price}>R$ {amount.toFixed(2)}</p>
      </div>

      <PaymentElement />

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      {infoMessage && <div className={styles.info}>{infoMessage}</div>}

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

interface CoursePurchaseProps {
  courseId: string;
  price: number;
  onPurchaseComplete: () => void;
  onCancel: () => void;
}

/**
 * Course purchase card with payment method selection.
 */
export default function CoursePurchase({
  courseId,
  price,
  onPurchaseComplete,
  onCancel,
}: CoursePurchaseProps) {
  const router = useRouter();
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCardSetup, setShowCardSetup] = useState(false);
  const [showCreatorTermsModal, setShowCreatorTermsModal] = useState(false);
  const [creatorTermsMessage, setCreatorTermsMessage] = useState<string | null>(
    null
  );

  const handleCreateIntent = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setCreatorTermsMessage(null);

    try {
      const result = await createCoursePaymentIntent(
        courseId,
        selectedPaymentMethod
      );

      if (
        result.code === "CARD_REQUIRED" ||
        result.error?.toLowerCase().includes("cadastrar um cartão")
      ) {
        setShowCardSetup(true);
        setIsLoading(false);
        return;
      }

      const creatorTermsFallback =
        result.error?.toLowerCase().includes("termos de venda") ||
        result.error?.toLowerCase().includes("aceitou os termos");
      if (result.code === "CREATOR_TERMS_REQUIRED" || creatorTermsFallback) {
        setCreatorTermsMessage(
          result.error ||
            "O criador deste curso ainda não aceitou os termos de venda."
        );
        setShowCreatorTermsModal(true);
        setIsLoading(false);
        return;
      }

      if (result.paymentIntent?.clientSecret) {
        setClientSecret(result.paymentIntent.clientSecret);
        setIsLoading(false);
        return;
      }

      setErrorMessage(result.error || "Erro ao iniciar o pagamento do curso");
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao iniciar o pagamento do curso");
    }
    setIsLoading(false);
  };

  const handleCardSetupSuccess = async () => {
    setShowCardSetup(false);
    await handleCreateIntent();
  };

  const handleCreatorTermsRedirect = () => {
    setShowCreatorTermsModal(false);
    router.push("/courses");
  };

  const stripePromise = getStripe();

  return (
    <>
      {showCreatorTermsModal && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3>Termos de venda pendentes</h3>
            <p>
              {creatorTermsMessage ||
                "O criador deste curso ainda não aceitou os termos de venda."}
            </p>
            <Button variant="primary" onClick={handleCreatorTermsRedirect}>
              Ver outros cursos
            </Button>
          </div>
        </div>
      )}
      <CardSetupModal
        isOpen={showCardSetup}
        onClose={() => setShowCardSetup(false)}
        onSuccess={handleCardSetupSuccess}
      />
      {clientSecret ? (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Finalizar compra</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                amount={price}
                onSuccess={onPurchaseComplete}
                onCancel={onCancel}
              />
            </Elements>
          </CardContent>
        </Card>
      ) : (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Comprar curso</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={styles.description}>
              Escolha a forma de pagamento para concluir sua matrícula.
            </p>

            <div className={styles.paymentMethodSection}>
              <p className={styles.sectionTitle}>Forma de pagamento:</p>
              <div className={styles.paymentMethods}>
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={`${styles.paymentMethodButton} ${
                      selectedPaymentMethod === method.id ? styles.selected : ""
                    }`}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                  >
                    <span className={styles.methodIcon}>{method.icon}</span>
                    <span>{method.label}</span>
                  </button>
                ))}
              </div>
              {selectedPaymentMethod === "boleto" && (
                <p className={styles.note}>
                  ⏰ Boletos vencem em 3 dias úteis. O acesso é liberado após a
                  confirmação do pagamento.
                </p>
              )}
            </div>

            {errorMessage && <div className={styles.error}>{errorMessage}</div>}

            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateIntent}
                loading={isLoading}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
