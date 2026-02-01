"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import {
  createConnectAccountV2,
  createProductV2,
  createSubscriptionCheckoutV2,
  getConnectStatusV2,
  getOnboardingLinkV2,
  listProductsV2,
  openBillingPortalV2,
  type ConnectV2Status,
  type StripeProduct,
} from "@/services/stripe-connect-v2";
import styles from "./page.module.css";

export default function ConnectV2Page() {
  const [status, setStatus] = useState<ConnectV2Status | null>(null);
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("usd");

  const storefrontUrl = useMemo(() => {
    if (!status?.accountId) return "";
    return `${window.location.origin}/storefront/${status.accountId}`;
  }, [status?.accountId]);

  const loadData = async () => {
    setIsLoading(true);
    const statusResult = await getConnectStatusV2();
    setStatus(statusResult);

    if (statusResult.hasAccount) {
      const productList = await listProductsV2();
      setProducts(productList);
    } else {
      setProducts([]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async () => {
    setActionLoading(true);
    const result = await createConnectAccountV2();
    if (result.error) {
      alert(result.error);
      setActionLoading(false);
      return;
    }
    await handleStartOnboarding();
    setActionLoading(false);
    await loadData();
  };

  const handleStartOnboarding = async () => {
    setActionLoading(true);
    const baseUrl = window.location.origin;
    const { url, error } = await getOnboardingLinkV2(
      `${baseUrl}/connect-v2?onboarding=complete`,
      `${baseUrl}/connect-v2?onboarding=refresh`
    );
    if (error) {
      alert(error);
    } else if (url) {
      window.location.href = url;
    }
    setActionLoading(false);
  };

  const handleCreateProduct = async () => {
    const priceInCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(priceInCents) || priceInCents <= 0) {
      alert("Informe um preço válido.");
      return;
    }

    setProductLoading(true);
    const result = await createProductV2({
      name,
      description: description || undefined,
      priceInCents,
      currency,
    });
    if (result.error) {
      alert(result.error);
    } else {
      setName("");
      setDescription("");
      setPrice("");
      const productList = await listProductsV2();
      setProducts(productList);
    }
    setProductLoading(false);
  };

  const handleSubscriptionCheckout = async () => {
    setSubscriptionLoading(true);
    const result = await createSubscriptionCheckoutV2();
    if (result.error) {
      alert(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
    setSubscriptionLoading(false);
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    const result = await openBillingPortalV2();
    if (result.error) {
      alert(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
    setPortalLoading(false);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Connect V2</CardTitle>
          </CardHeader>
          <CardContent>Carregando...</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Stripe Connect V2</CardTitle>
        </CardHeader>
        <CardContent>
          {!status?.hasAccount ? (
            <div className={styles.section}>
              <p className={styles.description}>
                Clique para iniciar o onboarding e habilitar recebimento.
              </p>
              <Button onClick={handleCreateAccount} loading={actionLoading}>
                Onboard para receber pagamentos
              </Button>
            </div>
          ) : (
            <div className={styles.section}>
              <div className={styles.statusRow}>
                <span>Status de onboarding:</span>
                <strong>
                  {status.onboardingComplete ? "Concluído" : "Pendente"}
                </strong>
              </div>
              <div className={styles.statusRow}>
                <span>Processar pagamentos:</span>
                <strong>
                  {status.readyToProcessPayments ? "Ativo" : "Inativo"}
                </strong>
              </div>
              <div className={styles.statusRow}>
                <span>Requisitos:</span>
                <strong>{status.requirementsStatus || "Não informado"}</strong>
              </div>
              {!status.onboardingComplete && (
                <Button onClick={handleStartOnboarding} loading={actionLoading}>
                  Completar onboarding
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {status?.hasAccount && (
        <Card variant="elevated" className={styles.cardSpacing}>
          <CardHeader>
            <CardTitle>Produtos do Criador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.form}>
              <label>
                Nome
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Descrição
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>
              <div className={styles.inlineFields}>
                <label>
                  Preço (ex: 29.90)
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label>
                  Moeda
                  <input
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </label>
              </div>
              <Button onClick={handleCreateProduct} loading={productLoading}>
                Criar produto
              </Button>
            </div>

            <div className={styles.productList}>
              {products.length === 0 && (
                <p className={styles.description}>Nenhum produto cadastrado.</p>
              )}
              {products.map((product) => (
                <div key={product.id} className={styles.productItem}>
                  <div>
                    <strong>{product.name}</strong>
                    {product.description && (
                      <p className={styles.description}>
                        {product.description}
                      </p>
                    )}
                  </div>
                  <span className={styles.priceTag}>
                    {product.default_price?.unit_amount
                      ? `${product.default_price.unit_amount / 100} ${
                          product.default_price.currency
                        }`
                      : "Sem preço"}
                  </span>
                </div>
              ))}
            </div>

            {storefrontUrl && (
              <div className={styles.storefront}>
                <span>Link público da loja (demo com accountId):</span>
                <a href={storefrontUrl} target="_blank" rel="noreferrer">
                  {storefrontUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status?.hasAccount && (
        <Card variant="elevated" className={styles.cardSpacing}>
          <CardHeader>
            <CardTitle>Assinatura do Criador</CardTitle>
          </CardHeader>
          <CardContent className={styles.section}>
            <p className={styles.description}>
              Assine um plano usando a conta conectada ou gerencie sua cobrança.
            </p>
            <div className={styles.inlineButtons}>
              <Button
                onClick={handleSubscriptionCheckout}
                loading={subscriptionLoading}
              >
                Assinar plano
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenPortal}
                loading={portalLoading}
              >
                Abrir portal de cobrança
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
