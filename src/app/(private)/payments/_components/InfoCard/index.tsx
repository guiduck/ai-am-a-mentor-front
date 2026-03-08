import { Card, CardContent } from "@/components/ui/Card/Card";
import styles from "./style.module.css";
import { InfoCardProps } from "./types";

const InfoCard = ({ isCreator }: InfoCardProps) => {
  const renderInfoSection = () => {
    if (!isCreator) {
      return (
        <>
          <div className={styles.infoItem}>
            <strong>Acesso aos Cursos</strong>
            <p>
              Compre cursos individualmente ou tenha acesso ilimitado com o
              plano Família.
            </p>
          </div>
          <div className={styles.infoItem}>
            <strong>Mentor IA</strong>
            <p>Tire suas dúvidas sobre as aulas com nosso assistente de IA.</p>
          </div>
          <div className={styles.infoItem}>
            <strong>Quizzes</strong>
            <p>Teste seu conhecimento com quizzes gerados automaticamente.</p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className={styles.infoItem}>
          <strong>Ative suas vendas</strong>
          <p>Aceite os termos e publique cursos pagos (cartão e boleto).</p>
        </div>
        <div className={styles.infoItem}>
          <strong>Créditos e IA</strong>
          <p>Receba créditos mensais, faça top-up e gere quizzes com IA.</p>
        </div>
        <div className={styles.infoItem}>
          <strong>Receba Pagamentos</strong>
          <p>
            Configure o Stripe para receber repasses. Sem cadastro, o repasse
            fica pendente.
          </p>
        </div>
      </>
    );
  };

  return (
    <Card variant="default" className={styles.infoCard}>
      <CardContent>
        <h3>ℹ️ Como Funciona</h3>
        <div className={styles.infoGrid}>{renderInfoSection()}</div>
      </CardContent>
    </Card>
  );
};

export default InfoCard;
