"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import {
  createStorefrontCheckout,
  listStorefrontProducts,
  type StripeProduct,
} from "@/services/stripe-connect-v2";
import styles from "./page.module.css";

export default function StorefrontPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const accountId = (params?.accountId as string) || "";
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";

  const title = useMemo(() => {
    if (!accountId) return "Loja do Criador";
    return `Loja do Criador (${accountId})`;
  }, [accountId]);

  useEffect(() => {
    const loadProducts = async () => {
      if (!accountId) return;
      setIsLoading(true);
      const data = await listStorefrontProducts(accountId);
      setProducts(data);
      setIsLoading(false);
    };
    loadProducts();
  }, [accountId]);

  const handleCheckout = async (product: StripeProduct) => {
    const priceId = product.default_price?.id;
    if (!priceId) {
      alert("Produto sem preço configurado.");
      return;
    }
    setCheckoutLoading(product.id);
    const result = await createStorefrontCheckout({
      accountId,
      priceId,
      quantity: 1,
      productId: product.id,
    });
    if (result.error) {
      alert(result.error);
    } else if (result.url) {
      window.location.href = result.url;
    }
    setCheckoutLoading(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{title}</h1>
        <p className={styles.subtitle}>
          Esta página usa o accountId apenas para demonstração. Em produção,
          prefira um identificador amigável.
        </p>
      </header>

      {success && (
        <div className={styles.messageSuccess}>
          Pagamento concluído com sucesso!
        </div>
      )}
      {canceled && (
        <div className={styles.messageWarning}>Pagamento cancelado.</div>
      )}

      {isLoading ? (
        <div className={styles.placeholder}>Carregando produtos...</div>
      ) : products.length === 0 ? (
        <div className={styles.placeholder}>Nenhum produto disponível.</div>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <div key={product.id} className={styles.card}>
              <div>
                <h3>{product.name}</h3>
                {product.description && (
                  <p className={styles.description}>{product.description}</p>
                )}
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.price}>
                  {product.default_price?.unit_amount
                    ? `${product.default_price.unit_amount / 100} ${
                        product.default_price.currency
                      }`
                    : "Sem preço"}
                </span>
                <Button
                  onClick={() => handleCheckout(product)}
                  loading={checkoutLoading === product.id}
                >
                  Comprar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
