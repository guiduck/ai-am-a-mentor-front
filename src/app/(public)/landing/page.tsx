"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/Button/Button";
import API from "@/lib/api";
import styles from "./page.module.css";

export default function LandingPage() {
  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    type: "creator" as "creator" | "student",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [statPercent, setStatPercent] = useState(0);
  const [statPrice, setStatPrice] = useState(150);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setStatPercent(100);
      setStatPrice(29);
      return;
    }

    let animationFrame = 0;
    const duration = 1200;
    const startPercent = 0;
    const endPercent = 100;
    const startPrice = 150;
    const endPrice = 29;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const nextPercent = Math.round(
        startPercent + (endPercent - startPercent) * progress
      );
      const nextPrice = Math.round(
        startPrice + (endPrice - startPrice) * progress
      );

      setStatPercent(nextPercent);
      setStatPrice(nextPrice);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };

    animationFrame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await API("leads", {
        method: "POST",
        data: leadForm,
      });

      if (response.data) {
        setSubmitSuccess(true);
        setLeadForm({ name: "", email: "", type: "creator" });
      }
    } catch (error) {
      console.error("Error submitting lead:", error);
    }

    setIsSubmitting(false);
  };

  return (
    <div className={styles.landingPage}>
      {/* Header */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/landing" className={styles.logo}>
            <div className={styles.logoIcon}>
              <span>AI</span>
            </div>
            <span className={styles.logoText}>Am A Mentor</span>
          </Link>
          <div className={styles.navActions}>
            <ButtonLink href="/login" variant="ghost">
              Entrar
            </ButtonLink>
            <ButtonLink href="/register" variant="primary">
              Começar Grátis
            </ButtonLink>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className={styles.hero}>
        <div className={styles.heroContainer}>
          <span className={styles.heroBadge}>🎓 Para Professores e Alunos</span>
          <h1 className={styles.heroTitle}>
            A plataforma de cursos online com{" "}
            <span className={styles.heroHighlight}>Inteligência Artificial</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Crie cursos em vídeo, gere quizzes automáticos com IA e ofereça um
            mentor virtual para seus alunos. Tudo em uma plataforma simples e
            acessível.
          </p>
          <div className={styles.heroActions}>
            <ButtonLink href="/register?role=creator" variant="primary" size="large">
              Sou Professor
            </ButtonLink>
            <ButtonLink
              href="/register?role=student"
              variant="outline"
              size="large"
              className={styles.heroSecondaryButton}
            >
              Sou Aluno
            </ButtonLink>
          </div>
        </div>
      </main>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>{statPercent}%</div>
            <div className={styles.statLabel}>Gratuito para começar</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>IA</div>
            <div className={styles.statLabel}>Quizzes automáticos</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>24/7</div>
            <div className={styles.statLabel}>Mentor virtual</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>R${statPrice}</div>
            <div className={styles.statLabel}>Plano básico/mês</div>
          </div>
        </div>
      </section>

      {/* For Teachers Section */}
      <section className={styles.forTeachers}>
        <div className={styles.sectionContainer}>
          <span className={styles.sectionBadge}>Para Professores</span>
          <h2 className={styles.sectionTitle}>
            Transforme seu conhecimento em cursos online
          </h2>
          <p className={styles.sectionSubtitle}>
            Você é professor particular, tutor ou educador? Crie seus cursos em
            vídeo e alcance mais alunos com a ajuda da inteligência artificial.
          </p>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>📹</div>
              <h3 className={styles.featureTitle}>Cursos em Vídeo</h3>
              <p className={styles.featureDescription}>
                Faça upload de suas aulas gravadas. A plataforma organiza tudo
                automaticamente.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🤖</div>
              <h3 className={styles.featureTitle}>Quizzes com IA</h3>
              <p className={styles.featureDescription}>
                Gere perguntas e avaliações automaticamente baseadas no conteúdo
                das suas aulas.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💬</div>
              <h3 className={styles.featureTitle}>Mentor IA para Alunos</h3>
              <p className={styles.featureDescription}>
                Seus alunos podem tirar dúvidas 24/7 com um assistente treinado
                no seu conteúdo.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <h3 className={styles.featureTitle}>Receba Pagamentos</h3>
              <p className={styles.featureDescription}>
                Venda seus cursos diretamente. Receba via Stripe com taxas a
                partir de 0%.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Students Section */}
      <section className={styles.forStudents}>
        <div className={styles.sectionContainer}>
          <span className={styles.sectionBadge}>Para Alunos</span>
          <h2 className={styles.sectionTitle}>
            Aprenda de forma interativa e personalizada
          </h2>
          <p className={styles.sectionSubtitle}>
            Acesse cursos de qualidade com suporte de IA para tirar suas dúvidas
            a qualquer momento.
          </p>

          <div className={styles.benefitsGrid}>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>Assista às aulas no seu ritmo</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>Tire dúvidas com o mentor IA 24/7</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>Teste seu conhecimento com quizzes</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>Acompanhe seu progresso</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>Plano Família: acesso a todos os cursos</span>
            </div>
            <div className={styles.benefitItem}>
              <span className={styles.benefitIcon}>✓</span>
              <span>5 perguntas grátis por dia</span>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className={`${styles.process} ${styles.sectionPattern}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.processLayout}>
            <div className={styles.processIntro}>
              <span className={styles.sectionBadge}>Como funciona</span>
              <h2 className={styles.sectionTitle}>
                Do vídeo ao aluno em um fluxo inteligente
              </h2>
              <p className={styles.sectionSubtitle}>
                A plataforma organiza o conteúdo, gera transcrição automática,
                cria quizzes com IA e libera o mentor virtual para seus alunos.
              </p>
              <ButtonLink href="/register?role=creator" variant="primary">
                Criar meu curso
              </ButtonLink>
            </div>

            <div className={styles.processSteps}>
              <div className={styles.processStep}>
                <span className={styles.processNumber}>1</span>
                <div>
                  <h3>Envie suas aulas</h3>
                  <p>
                    Faça upload dos vídeos e organize módulos sem perder tempo
                    com configurações complexas.
                  </p>
                </div>
              </div>
              <div className={styles.processStep}>
                <span className={styles.processNumber}>2</span>
                <div>
                  <h3>Transcrição automática</h3>
                  <p>
                    A IA gera a transcrição do vídeo para facilitar a criação
                    de conteúdo e o estudo dos alunos.
                  </p>
                </div>
              </div>
              <div className={styles.processStep}>
                <span className={styles.processNumber}>3</span>
                <div>
                  <h3>Quizzes e mentor IA</h3>
                  <p>
                    Crie avaliações inteligentes e ative o mentor virtual para
                    responder dúvidas em tempo real.
                  </p>
                </div>
              </div>
              <div className={styles.processStep}>
                <span className={styles.processNumber}>4</span>
                <div>
                  <h3>Venda e acompanhe</h3>
                  <p>
                    Publique o curso, acompanhe alunos e receba pagamentos com
                    taxas conforme o seu plano.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className={styles.pricing}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Planos Simples e Acessíveis</h2>
          <p className={styles.sectionSubtitle}>
            Comece grátis e faça upgrade quando precisar
          </p>

          <div className={styles.pricingTabs}>
            <span className={styles.pricingTabActive}>Professores</span>
            <span className={styles.pricingTabInactive}>Alunos</span>
          </div>

          <div className={styles.pricingGrid}>
            {/* Free Plan */}
            <div className={styles.pricingCard}>
              <h3 className={styles.pricingName}>Gratuito</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingAmount}>R$ 0</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>1 curso</li>
                <li>10 vídeos</li>
                <li>Assistente IA com transcrição de vídeo</li>
                <li>Sem quizzes IA</li>
                <li>5% taxa por venda</li>
                <li>Suporte comunidade</li>
              </ul>
              <div className={styles.pricingAction}>
                <ButtonLink href="/register?role=creator" variant="outline" fullWidth>
                  Começar Grátis
                </ButtonLink>
              </div>
            </div>

            {/* Basic Plan */}
            <div className={`${styles.pricingCard} ${styles.pricingCardPopular}`}>
              <span className={styles.popularBadge}>MAIS POPULAR</span>
              <h3 className={styles.pricingName}>Básico</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingAmount}>R$ 29</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>5 cursos</li>
                <li>50 vídeos</li>
                <li>5 quizzes/mês com IA</li>
                <li>3% taxa por venda</li>
                <li>Suporte por email</li>
              </ul>
              <div className={styles.pricingAction}>
                <ButtonLink href="/register?role=creator&plan=basic" variant="primary" fullWidth>
                  Assinar Básico
                </ButtonLink>
              </div>
            </div>

            {/* Pro Plan */}
            <div className={styles.pricingCard}>
              <h3 className={styles.pricingName}>Profissional</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingAmount}>R$ 69</span>
                <span className={styles.pricingPeriod}>/mês</span>
              </div>
              <ul className={styles.pricingFeatures}>
                <li>Cursos ilimitados</li>
                <li>Vídeos ilimitados</li>
                <li>Quizzes ilimitados</li>
                <li>0% taxa por venda</li>
                <li>Suporte prioritário</li>
                <li>Certificados inclusos</li>
              </ul>
              <div className={styles.pricingAction}>
                <ButtonLink href="/register?role=creator&plan=pro" variant="outline" fullWidth>
                  Assinar Pro
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture Section */}
      <section className={styles.leadCapture}>
        <div className={styles.leadContainer}>
          <h2 className={styles.leadTitle}>
            Quer saber mais? Receba novidades!
          </h2>
          <p className={styles.leadSubtitle}>
            Cadastre-se para receber dicas e atualizações sobre a plataforma.
          </p>

          {submitSuccess ? (
            <div className={styles.successMessage}>
              <span className={styles.successIcon}>✓</span>
              <p>Cadastro realizado! Em breve você receberá novidades.</p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className={styles.leadForm}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={leadForm.name}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, name: e.target.value })
                  }
                  required
                  className={styles.formInput}
                />
                <input
                  type="email"
                  placeholder="Seu email"
                  value={leadForm.email}
                  onChange={(e) =>
                    setLeadForm({ ...leadForm, email: e.target.value })
                  }
                  required
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formRow}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="type"
                    value="creator"
                    checked={leadForm.type === "creator"}
                    onChange={() => setLeadForm({ ...leadForm, type: "creator" })}
                  />
                  <span>Sou Professor</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="type"
                    value="student"
                    checked={leadForm.type === "student"}
                    onChange={() => setLeadForm({ ...leadForm, type: "student" })}
                  />
                  <span>Sou Aluno</span>
                </label>
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="large"
                loading={isSubmitting}
              >
                Quero Receber Novidades
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faq}>
        <div className={styles.sectionContainer}>
          <h2 className={styles.sectionTitle}>Perguntas Frequentes</h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h4>Como funciona a geração de quizzes com IA?</h4>
              <p>
                A IA analisa o conteúdo dos seus vídeos e gera perguntas
                automaticamente. Você pode revisar e editar antes de publicar.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Qual a diferença para Hotmart ou Kiwify?</h4>
              <p>
                Além de vender cursos, oferecemos IA integrada: quizzes
                automáticos e mentor virtual para tirar dúvidas dos alunos 24/7.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Posso usar mesmo sem pagar?</h4>
              <p>
                Sim! O plano gratuito permite criar 1 curso com até 10 vídeos.
                Perfeito para testar a plataforma.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h4>Como recebo os pagamentos?</h4>
              <p>
                Usamos Stripe para processar pagamentos. Você configura sua
                conta e recebe diretamente, com taxas transparentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>Pronto para começar?</h2>
          <p className={styles.ctaSubtitle}>
            Crie sua conta gratuita e comece a ensinar ou aprender hoje mesmo.
          </p>
          <div className={styles.ctaActions}>
            <ButtonLink href="/register?role=creator" variant="primary" size="large">
              Criar Conta de Professor
            </ButtonLink>
            <ButtonLink href="/register?role=student" variant="outline" size="large">
              Criar Conta de Aluno
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.footerText}>
            &copy; 2025 AI Am A Mentor. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
