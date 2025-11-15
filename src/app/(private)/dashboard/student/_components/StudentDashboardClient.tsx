"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, type User } from "@/stores/authStore";
import { logoutUser } from "@/actions/logout";
import { getEnrolledCourses, Course } from "@/services/courses";
import { initializeAuthFromAPI } from "@/lib/auth-utils";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
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

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>Dashboard do Estudante</h1>
            <p>Bem-vindo de volta, {user?.username || "Estudante"}!</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Sair
          </Button>
        </div>

        <div className={styles.cardsGrid}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Meus Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.cardDescription}>
                {loading
                  ? "Carregando..."
                  : `Você está inscrito em ${enrolledCourses.length} curso${
                      enrolledCourses.length !== 1 ? "s" : ""
                    }.`}
              </p>
              <Button
                onClick={handleViewMyCourses}
                variant="primary"
                size="small"
              >
                Ver Meus Cursos
              </Button>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Explorar Cursos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.cardDescription}>
                Descubra novos cursos e expanda seus conhecimentos.
              </p>
              <Button
                onClick={handleBrowseCourses}
                variant="primary"
                size="small"
              >
                Explorar
              </Button>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.cardDescription}>
                Acompanhe seu progresso nos cursos e conquistas.
              </p>
              <Button variant="primary" size="small">
                Ver Progresso
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className={styles.accountInfo}>
          <Card variant="default">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.infoList}>
                <p className={styles.infoItem}>
                  <span className={styles.infoLabel}>ID:</span> {user?.id}
                </p>
                <p className={styles.infoItem}>
                  <span className={styles.infoLabel}>Nome:</span>{" "}
                  {user?.username}
                </p>
                <p className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email:</span> {user?.email}
                </p>
                <p className={styles.infoItem}>
                  <span className={styles.infoLabel}>Tipo:</span> Estudante
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

