"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  getCourseById,
  Course,
  enrollInCourse,
  checkEnrollmentStatus,
  EnrollmentStatus,
} from "@/services/courses";
import { getCourseVideos, Video } from "@/services/videos";
import { Button } from "@/components/ui/Button/Button";
import { toast } from "sonner";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import styles from "./page.module.css";

export default function CourseDetailPage() {
  const { id: courseId } = useParams() as { id: string };
  const { user } = useAuthStore();
  const router = useRouter();

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (courseId && user) {
      loadCourseData();
    }
  }, [courseId, user]);

  const loadCourseData = async () => {
    try {
      setLoading(true);

      // Load course details
      const courseData = await getCourseById(courseId);
      if (!courseData) {
        toast.error("Curso não encontrado");
        router.push("/courses");
        return;
      }
      setCourse(courseData);

      // Load videos if user has access
      if (user?.role === "creator" && courseData.creatorId === user.id) {
        // Creator can always see their own course videos
        const courseVideos = await getCourseVideos(courseId);
        setVideos(courseVideos);
      } else if (user?.role === "student") {
        // Check enrollment status first
        const status = await checkEnrollmentStatus(courseId);
        setEnrollmentStatus(status);

        if (status?.isEnrolled) {
          // Student is enrolled, load videos
          const courseVideos = await getCourseVideos(courseId);
          setVideos(courseVideos);
        }
      }
    } catch (error) {
      console.error("Error loading course data:", error);
      toast.error("Erro ao carregar dados do curso");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || user.role !== "student") return;

    try {
      setEnrolling(true);
      await enrollInCourse(courseId);
      toast.success("Inscrição realizada com sucesso!");

      // Reload course data to show videos
      await loadCourseData();
    } catch (error: any) {
      toast.error(error.message || "Erro ao se inscrever no curso");
    } finally {
      setEnrolling(false);
    }
  };

  const handleAddVideo = () => {
    router.push(`/course/${courseId}/add-video`);
  };

  const handleWatchVideo = (videoId: string) => {
    router.push(`/course/${courseId}/lesson/${videoId}`);
  };

  const handleEditVideo = (videoId: string) => {
    router.push(`/course/${courseId}/edit-video/${videoId}`);
  };

  if (loading) {
    return <FullPageLoading text="Carregando curso..." />;
  }

  if (!course) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Curso não encontrado</div>
      </div>
    );
  }

  const isCreator = user?.role === "creator" && course.creatorId === user.id;
  const isStudent = user?.role === "student";
  const isEnrolled = enrollmentStatus?.isEnrolled || false;

  // Calculate total duration from videos (in seconds)
  const totalDuration = videos.reduce(
    (sum, video) => sum + (video.duration || 0),
    0
  );
  const estimatedHours = Math.max(1, Math.round(totalDuration / 3600));

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.heroCard}>
          <div className={styles.heroText}>
            <span className={styles.heroBadge}>Curso com mentoria</span>
            <h1>{course.title}</h1>
            <p>{course.description}</p>

            <div className={styles.heroMeta}>
              <div>
                <span className={styles.metaLabel}>Investimento</span>
                <strong>R$ {course.price}</strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Aulas disponíveis</span>
                <strong>
                  {videos.length} {videos.length === 1 ? "aula" : "aulas"}
                </strong>
              </div>
              <div>
                <span className={styles.metaLabel}>Mentor</span>
                <strong>{course.creator?.username || "Mentoria AI"}</strong>
              </div>
            </div>

            <div className={styles.heroActions}>
              {isCreator && (
                <Button onClick={handleAddVideo} variant="primary" size="large">
                  Adicionar vídeo
                </Button>
              )}
              {isStudent && !isEnrolled && (
                <Button
                  onClick={handleEnroll}
                  variant="primary"
                  size="large"
                  loading={enrolling}
                >
                  {enrolling ? "Inscrevendo..." : "Se inscrever"}
                </Button>
              )}
              {(isStudent && isEnrolled) || isCreator ? (
                <Button
                  variant="outline"
                  size="large"
                  onClick={() => router.push("/courses")}
                >
                  Ver outros cursos
                </Button>
              ) : null}
            </div>
          </div>

          <div className={styles.heroStats}>
            <div>
              <span>{estimatedHours}h</span>
              <p>Duração sugerida</p>
            </div>
            <div>
              <span>{Math.max(1, videos.length)} módulos</span>
              <p>Conteúdo estruturado</p>
            </div>
            <div>
              <span>100%</span>
              <p>Mentoria com IA</p>
            </div>
          </div>
        </section>

        {isStudent && !isEnrolled && (
          <div className={styles.enrollmentBanner}>
            <h3>Desbloqueie o conteúdo completo</h3>
            <p>
              Inscreva-se para assistir às aulas, acompanhar projetos guiados e
              receber feedback da mentoria inteligente.
            </p>
          </div>
        )}

        {(isCreator || (isStudent && isEnrolled)) && (
          <section className={styles.syllabus}>
            <header>
              <div>
                <p className={styles.syllabusKicker}>
                  {isCreator ? "Gerenciamento" : "Trilha de aulas"}
                </p>
                <h2>Aulas do curso</h2>
              </div>
              <span>{videos.length} conteúdo(s)</span>
            </header>

            {videos.length === 0 ? (
              <div className={styles.emptyList}>
                {isCreator
                  ? "Nenhum vídeo adicionado ainda. Clique em “Adicionar vídeo” para começar."
                  : "Este curso ainda não possui aulas disponíveis."}
              </div>
            ) : (
              <ol className={styles.lessonList}>
                {videos.map((video, index) => (
                  <li key={video.id} className={styles.lessonItem}>
                    <div>
                      <span className={styles.lessonIndex}>
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                      <div>
                        <h3>{video.title}</h3>
                        <p>
                          Publicado em{" "}
                          {new Date(video.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className={styles.lessonActions}>
                      {video.duration && (
                        <span className={styles.lessonDuration}>
                          {Math.floor(video.duration / 60)}:
                          {(video.duration % 60).toString().padStart(2, "0")}{" "}
                          min
                        </span>
                      )}
                      {isCreator ? (
                        <div className={styles.lessonButtons}>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleWatchVideo(video.id)}
                          >
                            Visualizar
                          </Button>
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleEditVideo(video.id)}
                          >
                            Editar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleWatchVideo(video.id)}
                        >
                          Assistir aula
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
