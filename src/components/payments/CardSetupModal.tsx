"use client";

import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createCardSetupIntent } from "@/services/payments";
import { Button } from "@/components/ui/Button/Button";
import styles from "./CardSetupModal.module.css";

interface CardSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Formulário para cadastrar cartão via Stripe SetupIntent.
 */
function SetupForm({ onSuccess, onCancel }: SetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Erro ao cadastrar cartão");
        setIsSubmitting(false);
        return;
      }

      if (setupIntent?.status === "succeeded") {
        onSuccess();
        return;
      }

      setErrorMessage(
        "Cadastro em processamento. Tente novamente em alguns instantes."
      );
      setIsSubmitting(false);
    } catch (error: any) {
      setErrorMessage(error.message || "Erro ao cadastrar cartão");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <PaymentElement />

      {errorMessage && <div className={styles.error}>{errorMessage}</div>}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Voltar
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Salvar cartão
        </Button>
      </div>
    </form>
  );
}

/**
 * Modal para cadastrar cartão antes de efetuar compras.
 */
export default function CardSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: CardSetupModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadSetupIntent = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      const result = await createCardSetupIntent();
      if (result.error || !result.clientSecret) {
        setErrorMessage(result.error || "Erro ao iniciar o cadastro de cartão");
        setIsLoading(false);
        return;
      }
      setClientSecret(result.clientSecret);
      setIsLoading(false);
    };

    void loadSetupIntent();
  }, [isOpen]);

  if (!isOpen) return null;

  const stripePromise = getStripe();

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h3>Cadastrar cartão</h3>
          <p>Salve um cartão para agilizar suas próximas compras.</p>
        </header>

        {isLoading && <p className={styles.loading}>Carregando...</p>}
        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        {clientSecret && !isLoading && !errorMessage && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SetupForm onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        )}
      </div>
    </div>
  );
}
