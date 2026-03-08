"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card/Card";
import {
  getConnectStatus,
  createConnectAccount,
  getOnboardingLink,
  getDashboardLink,
  getCreatorBalance,
  ConnectAccountStatus,
  ConnectBalance,
} from "@/services/stripe-connect";
import {
  getCreatorTermsStatus,
  acceptCreatorTerms,
  CreatorTermsStatus,
} from "@/services/creator-terms";
import styles from "./CreatorBankSetup.module.css";

export default function CreatorBankSetup() {
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null);
  const [balance, setBalance] = useState<ConnectBalance | null>(null);
  const [termsStatus, setTermsStatus] = useState<CreatorTermsStatus | null>(null);
  const [termsChecked, setTermsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [termsActionLoading, setTermsActionLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    const [statusResult, termsResult] = await Promise.all([
      getConnectStatus(),
      getCreatorTermsStatus(),
    ]);

    setStatus(statusResult);
    setTermsStatus(termsResult);

    if (statusResult.isComplete) {
      const balanceResult = await getCreatorBalance();
      setBalance(balanceResult);
    }
    setIsLoading(false);
  };

  const handleCreateAccount = async () => {
    setActionLoading(true);
    const result = await createConnectAccount();
    
    if (result.error) {
      alert(result.error);
    } else {
      // After creating account, get onboarding link
      await handleStartOnboarding();
    }
    setActionLoading(false);
    await loadStatus();
  };

  const handleStartOnboarding = async () => {
    setActionLoading(true);
    const baseUrl = window.location.origin;
    const result = await getOnboardingLink(
      `${baseUrl}/payments?onboarding=complete`,
      `${baseUrl}/payments?onboarding=refresh`
    );

    if (result.error) {
      alert(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
    setActionLoading(false);
  };

  const handleOpenDashboard = async () => {
    setActionLoading(true);
    const result = await getDashboardLink();

    if (result.error) {
      alert(result.error);
    } else if (result.url) {
      window.open(result.url, "_blank");
    }
    setActionLoading(false);
  };

  /**
   * Accept creator terms and refresh status.
   */
  const handleAcceptTerms = async () => {
    if (!termsStatus?.version) {
      return;
    }

    setTermsActionLoading(true);
    const result = await acceptCreatorTerms(termsStatus.version);

    if ("error" in result) {
      alert(result.error);
    } else {
      setTermsChecked(false);
      await loadStatus();
    }
    setTermsActionLoading(false);
  };

  const acceptedAtLabel = termsStatus?.acceptedAt
    ? new Date(termsStatus.acceptedAt).toLocaleString("pt-BR")
    : "";

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>🏦 Recebimento de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>🏦 Recebimento de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent>
        {termsStatus && (
          <div className={styles.termsSection}>
            <h3 className={styles.termsTitle}>{termsStatus.title}</h3>
            <p className={styles.description}>
              Para vender cursos, é necessário aceitar os termos abaixo.
            </p>
            <ul className={styles.termsList}>
              {termsStatus.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.notice}>
              <strong>Importante:</strong> você pode começar a vender assim que
              aceitar os termos. O repasse fica pendente até concluir o
              recebimento no Stripe.
            </div>

            {termsStatus.accepted ? (
              <div className={styles.termsAccepted}>
                ✓ Termos aceitos {acceptedAtLabel ? `em ${acceptedAtLabel}` : ""}
              </div>
            ) : (
              <div className={styles.termsActions}>
                <label className={styles.termsCheckbox}>
                  <input
                    type="checkbox"
                    checked={termsChecked}
                    onChange={(event) => setTermsChecked(event.target.checked)}
                  />
                  Li e aceito os termos acima
                </label>
                <Button
                  onClick={handleAcceptTerms}
                  loading={termsActionLoading}
                  disabled={!termsChecked || termsActionLoading}
                >
                  Aceitar termos
                </Button>
              </div>
            )}
          </div>
        )}

        {!status?.hasAccount ? (
          // No account yet
          <div className={styles.setupSection}>
            <div className={styles.icon}>💳</div>
            <h3>Configure seus dados bancários</h3>
            <p className={styles.description}>
              Para receber pagamentos dos seus cursos, você precisa configurar
              uma conta Stripe Connect. Isso permite que você receba o dinheiro
              diretamente na sua conta bancária.
            </p>
            <div className={styles.notice}>
              <strong>Venda liberada:</strong> você pode vender mesmo sem esta
              etapa, mas o repasse ficará pendente até finalizar o cadastro.
            </div>
            <div className={styles.benefits}>
              <div className={styles.benefit}>
                <span>✓</span> Taxa conforme o seu plano (5% a 0%)
              </div>
              <div className={styles.benefit}>
                <span>✓</span> Repasses automáticos após cadastro completo
              </div>
              <div className={styles.benefit}>
                <span>✓</span> Dashboard completo de vendas
              </div>
            </div>
            <Button
              onClick={handleCreateAccount}
              loading={actionLoading}
              size="large"
            >
              Configurar Recebimento
            </Button>
          </div>
        ) : !status?.isComplete ? (
          // Account exists but not complete
          <div className={styles.setupSection}>
            <div className={styles.iconWarning}>⚠️</div>
            <h3>Complete sua configuração</h3>
            <p className={styles.description}>
              Você iniciou a configuração da sua conta, mas ainda não a
              completou. Finalize o cadastro para começar a receber pagamentos.
            </p>
            <div className={styles.notice}>
              <strong>Venda liberada:</strong> cursos podem ser vendidos, mas o
              repasse fica pendente até concluir o Stripe.
            </div>
            <div className={styles.statusItems}>
              <div className={`${styles.statusItem} ${status.chargesEnabled ? styles.complete : styles.pending}`}>
                {status.chargesEnabled ? "✓" : "○"} Receber pagamentos
              </div>
              <div className={`${styles.statusItem} ${status.payoutsEnabled ? styles.complete : styles.pending}`}>
                {status.payoutsEnabled ? "✓" : "○"} Transferir para conta bancária
              </div>
            </div>
            <Button
              onClick={handleStartOnboarding}
              loading={actionLoading}
              size="large"
            >
              Completar Configuração
            </Button>
          </div>
        ) : (
          // Account complete
          <div className={styles.completeSection}>
            <div className={styles.statusBadge}>
              <span className={styles.statusDot}></span>
              Conta Ativa
            </div>

            {balance && (
              <div className={styles.balanceCards}>
                <div className={styles.balanceCard}>
                  <span className={styles.balanceLabel}>Disponível</span>
                  <span className={styles.balanceValue}>
                    R$ {balance.available.toFixed(2)}
                  </span>
                </div>
                <div className={styles.balanceCard}>
                  <span className={styles.balanceLabel}>Pendente</span>
                  <span className={styles.balanceValue}>
                    R$ {balance.pending.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <p className={styles.info}>
              Você está configurado para receber pagamentos! O dinheiro das
              vendas será transferido automaticamente para sua conta bancária.
            </p>

            <div className={styles.feeInfo}>
              <strong>Taxa da plataforma:</strong> conforme seu plano (5% a 0%)
            </div>
            <div className={styles.notice}>
              Pagamentos no MVP: cartão e boleto. Pix entra apenas após 60 dias.
            </div>

            <Button
              onClick={handleOpenDashboard}
              loading={actionLoading}
              variant="outline"
            >
              Acessar Dashboard Stripe
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
