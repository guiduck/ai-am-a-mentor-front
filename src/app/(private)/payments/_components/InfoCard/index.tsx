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
          <strong>Crie Cursos</strong>
          <p>Publique seus cursos em vídeo e alcance milhares de alunos.</p>
        </div>
        <div className={styles.infoItem}>
          <strong>Quizzes com IA</strong>
          <p>Gere quizzes automaticamente baseados no conteúdo das aulas.</p>
        </div>
        <div className={styles.infoItem}>
          <strong>Receba Pagamentos</strong>
          <p>Configure sua conta bancária e receba suas vendas diretamente.</p>
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
