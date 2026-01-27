"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type User } from "@/stores/authStore";
import { logoutUser } from "@/actions/logout";
import { getCoursesByCreator, Course } from "@/services/courses";
import { initializeAuthFromAPI } from "@/lib/auth-utils";
import { getCourseVideos } from "@/services/videos";
import { Button } from "@/components/ui/Button/Button";
import { Loading } from "@/components/ui/Loading/Loading";
import styles from "../page.module.css";
import { toast } from "sonner";

interface CreatorDashboardClientProps {
  initialUser: User | null;
}

const parsePrice = (price: string) => {
  const normalized = price
    .toString()
    .replace(/[^\d,.,-]/g, "")
    .replace(/\.(?=.*\.)/g, "")
    .replace(",", ".");
  const value = Number(normalized);
  return Number.isNaN(value) ? 0 : value;
};

export default function CreatorDashboardClient({
  initialUser,
}: CreatorDashboardClientProps) {
  const { user, setAuth } = useAuthStore();
  console.log("[dashboard/creator/client] render", {
    hasStoreUser: Boolean(user),
    hasInitialUser: Boolean(initialUser),
  });
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLessons, setTotalLessons] = useState(0);
  const lastLoadedUserIdRef = useRef<string | null>(null);

  const hasAccessTokenCookie = () => {
    if (typeof document === "undefined") return false;
    return document.cookie
      .split(";")
      .some((cookie) => cookie.trim().startsWith("access_token="));
  };

  useEffect(() => {
    if (!user && initialUser) {
      if (hasAccessTokenCookie()) {
        console.log("[dashboard/creator/client] hydrating store from cookie");
        setAuth(initialUser, "");
        return;
      }
    } else if (!user) {
      console.log("[dashboard/creator/client] initializing from API");
      initializeAuthFromAPI();
    }
  }, [initialUser, setAuth, user]);

  useEffect(() => {
    if (!user) {
      lastLoadedUserIdRef.current = null;
      return;
    }

    if (user.role !== "creator") {
      router.replace("/dashboard/student");
      return;
    }

    if (lastLoadedUserIdRef.current === user.id) {
      return;
    }

    lastLoadedUserIdRef.current = user.id;
    loadCourses();
  }, [user, router]);

  const loadCourses = async () => {
    console.log("[dashboard/creator/client] loadCourses start");
    try {
      const creatorCourses = await getCoursesByCreator();
      setCourses(creatorCourses);
      const lessonCounts = await Promise.all(
        creatorCourses.map(async (course) => {
          try {
            const videos = await getCourseVideos(course.id);
            return videos.length;
          } catch (error) {
            console.error(
              "[dashboard/creator/client] Error counting videos:",
              error
            );
            return 0;
          }
        })
      );
      setTotalLessons(lessonCounts.reduce((sum, count) => sum + count, 0));
      console.log("[dashboard/creator/client] loadCourses success", {
        count: creatorCourses.length,
      });
    } catch (error) {
      console.error("[dashboard/creator/client] Error loading courses:", error);
      toast.error("Erro ao carregar cursos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  const handleCreateCourse = () => {
    router.push("/courses/create");
  };

  const handleViewCourses = () => {
    router.push("/courses/manage");
  };

  const totalRevenue = courses.reduce(
    (sum, course) => sum + parsePrice(course.price),
    0
  );

  const recentCourses = courses.slice(0, 3);

  return (
    <div className={styles.page}>
      <div className={styles.heroCard}>
        <div className={styles.heroContent}>
          <p className={styles.heroKicker}>Dashboard do criador</p>
          <h1>
            Bem-vindo, {user?.username || "Criador"}. Transforme suas ideias em
            trilhas de aprendizado.
          </h1>
          <p>
            Organize cursos, publique novas aulas e acompanhe o desempenho da
            sua comunidade com um painel inspirado no melhor do Codecademy.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" onClick={handleCreateCourse}>
              Novo curso
            </Button>
            <Button variant="outline" onClick={handleViewCourses}>
              Gerenciar biblioteca
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div>
            <span>{courses.length}</span>
            <p>Cursos publicados</p>
          </div>
          <div>
            <span>
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalRevenue)}
            </span>
            <p>Potencial de faturamento</p>
          </div>
          <div>
            <span>{totalLessons} aulas</span>
            <p>Conteúdos mentorados</p>
          </div>
        </div>
      </div>

      <section className={styles.insightsGrid}>
        <div className={styles.insightCard}>
          <p className={styles.insightLabel}>Planos em destaque</p>
          <h3>Crie uma nova trilha com IA</h3>
          <p>
            Combine aulas gravadas com atividades práticas e deixe a mentoria
            inteligente personalizar os próximos passos dos alunos.
          </p>
          <Button variant="primary" size="small" onClick={handleCreateCourse}>
            Começar agora
          </Button>
        </div>

        <div className={styles.insightCard}>
          <p className={styles.insightLabel}>Engajamento</p>
          <h3>Envie uma atualização para seus alunos</h3>
          <p>
            Conteúdos recentes recebem 32% mais visualizações quando você envia
            um resumo semanal. Use este espaço para destacar novidades.
          </p>
          <Button variant="outline" size="small" onClick={handleViewCourses}>
            Abrir centro de mensagens
          </Button>
        </div>
      </section>

      <section className={styles.courseSection}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.sectionKicker}>Biblioteca</p>
            <h2>Últimos cursos publicados</h2>
          </div>
          <Button variant="outline" onClick={handleViewCourses}>
            Ver todos
          </Button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <Loading text="Carregando cursos..." />
          </div>
        ) : recentCourses.length === 0 ? (
          <div className={styles.emptyState}>
            Você ainda não publicou cursos. Que tal criar o primeiro?
          </div>
        ) : (
          <div className={styles.courseList}>
            {recentCourses.map((course) => (
              <article key={course.id} className={styles.courseRow}>
                <div>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                </div>
                <div className={styles.courseRowMeta}>
                  <span>
                    Atualizado em{" "}
                    {new Date(course.updatedAt).toLocaleDateString("pt-BR")}
                  </span>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => router.push(`/course/${course.id}`)}
                  >
                    Abrir curso
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
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
            <strong>Criador</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
