"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type User } from "@/stores/authStore";
import { logoutUser } from "@/actions/logout";
import { getEnrolledCourses, Course } from "@/services/courses";
import { initializeAuthFromAPI } from "@/lib/auth-utils";
import { Button } from "@/components/ui/Button/Button";
import styles from "../page.module.css";
import { toast } from "sonner";

interface StudentDashboardClientProps {
  initialUser: User | null;
}

export default function StudentDashboardClient({
  initialUser,
}: StudentDashboardClientProps) {
  const { user, setAuth } = useAuthStore();
  console.log("[dashboard/student/client] render", {
    hasStoreUser: Boolean(user),
    hasInitialUser: Boolean(initialUser),
  });
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user && initialUser) {
      console.log("[dashboard/student/client] hydrating store from cookie");
      setAuth(initialUser, "");
    } else if (!user) {
      console.log("[dashboard/student/client] initializing from API");
      initializeAuthFromAPI();
    }
  }, [initialUser, setAuth, user]);

  useEffect(() => {
    if (user && user.role !== "student") {
      router.replace("/dashboard/creator");
      return;
    }

    if (user) {
      loadEnrolledCourses();
    }
  }, [user, router]);

  const loadEnrolledCourses = async () => {
    console.log("[dashboard/student/client] loadEnrolledCourses start");
    try {
      const courses = await getEnrolledCourses();
      setEnrolledCourses(courses);
      console.log("[dashboard/student/client] loadEnrolledCourses success", {
        count: courses.length,
      });
    } catch (error) {
      console.error(
        "[dashboard/student/client] Error loading enrolled courses:",
        error
      );
      toast.error("Erro ao carregar cursos inscritos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/logout";
    }
  };

  const handleBrowseCourses = () => {
    router.push("/courses");
  };

  const handleViewMyCourses = () => {
    router.push("/courses/enrolled");
  };

const parsePrice = (price: string) => {
  const normalized = price
    .toString()
    .replace(/[^\d,.,-]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isNaN(value) ? 0 : value;
};

const learningProgress = Math.min(100, enrolledCourses.length * 20);
const featuredCourse = enrolledCourses[0];
const totalInvestment = enrolledCourses.reduce(
  (sum, course) => sum + parsePrice(course.price),
  0
);

  return (
    <div className={styles.page}>
      <div className={styles.heroCard}>
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>Jornada de aprendizado</p>
          <h1>
            Olá, {user?.username || "estudante"}. Continue evoluindo com sua
            trilha personalizada.
          </h1>
          <p>
            Cada curso combina aulas em vídeo com mentoria de IA para sugerir o
            próximo passo. Termine módulos, marque progresso e desbloqueie novos
            projetos.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={handleViewMyCourses}>
              Retomar cursos
            </Button>
            <Button variant="outline" onClick={handleBrowseCourses}>
              Explorar catálogo
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div>
            <span>{enrolledCourses.length}</span>
            <p>Cursos em andamento</p>
          </div>
          <div>
            <span>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalInvestment)}
            </span>
            <p>Total investido</p>
          </div>
          <div>
            <span>{learningProgress}%</span>
            <p>Plano semanal concluído</p>
          </div>
        </div>
      </div>

      <section className={styles.progressSection}>
        <header className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>Plano ativo</p>
            <h2>Seu ritmo de estudos</h2>
          </div>
          <span className={styles.progressBadge}>{learningProgress}%</span>
        </header>

        <div className={styles.progressBar}>
          <div style={{ width: `${learningProgress}%` }} />
        </div>

        <div className={styles.progressActions}>
          <Button variant="primary" size="small" onClick={handleViewMyCourses}>
            Ver próximos módulos
          </Button>
          <Button variant="outline" size="small" onClick={handleBrowseCourses}>
            Ajustar plano
          </Button>
        </div>
      </section>

      <section className={styles.courseSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>Cursos inscritos</p>
            <h2>Continue de onde parou</h2>
          </div>
          <Button variant="outline" onClick={handleViewMyCourses}>
            Ver todos
          </Button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Carregando cursos...</div>
        ) : enrolledCourses.length === 0 ? (
          <div className={styles.emptyState}>
            Você ainda não se inscreveu em cursos. Explore o catálogo e comece
            uma nova trilha.
          </div>
        ) : (
          <div className={styles.courseList}>
            {enrolledCourses.slice(0, 4).map((course) => (
              <article key={course.id} className={styles.courseRow}>
                <div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </div>
                <div className={styles.courseRowMeta}>
                  <span>
                    Inscrito em{" "}
                    {new Date(course.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => router.push(`/course/${course.id}`)}
                  >
                    Retomar aula
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.featuredCard}>
        <div>
          <p className={styles.sectionKicker}>Sugestão da mentoria</p>
          <h3>
            {featuredCourse
              ? `Aprofunde-se em “${featuredCourse.title}”`
              : "Comece uma nova trilha personalizada"}
          </h3>
          <p>
            {featuredCourse
              ? "Finalize o próximo módulo para liberar projetos aplicados e feedback com IA."
              : "Escolha um curso para desbloquear atividades guiadas e recomendações inteligentes."}
          </p>
        </div>
        <Button variant="primary" onClick={handleBrowseCourses}>
          Ver recomendações
        </Button>
      </section>

      <section className={styles.accountCard}>
        <h3>Informações da conta</h3>
        <div className={styles.accountGrid}>
          <div>
            <span>ID</span>
            <strong>{user?.id}</strong>
          </div>
          <div>
            <span>Nome</span>
            <strong>{user?.username}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div>
            <span>Função</span>
            <strong>Estudante</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

