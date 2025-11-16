"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCourses } from "@/services/courses";
import { Button } from "@/components/ui/Button/Button";
import styles from "./page.module.css";
import { toast } from "sonner";

interface Course {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  price: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
  };
}

const CATEGORY_FILTERS = [
  "Todos",
  "Programação",
  "Design",
  "IA",
  "Marketing",
  "Produtividade",
];

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const allCourses = await getCourses();
      setCourses(allCourses);
    } catch (error) {
      console.error("Error loading courses:", error);
      toast.error("Erro ao carregar cursos");
    } finally {
      setLoading(false);
    }
  };

  const handleViewCourse = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.innerContainer}>
          <h1>Carregando cursos...</h1>
        </div>
      </div>
    );
  }

  const uniqueCreators = useMemo(() => {
    const ids = new Set(
      courses.map((course) => course.creator?.id || course.creatorId)
    );
    return ids.size;
  }, [courses]);

  const averagePrice = useMemo(() => {
    if (!courses.length) return 0;
    const sum = courses.reduce(
      (total, course) => total + parseFloat(course.price),
      0
    );
    return sum / courses.length;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (selectedCategory === "Todos") return courses;

    const needle = selectedCategory.toLowerCase();
    return courses.filter((course) =>
      `${course.title} ${course.description}`.toLowerCase().includes(needle)
    );
  }, [courses, selectedCategory]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroKicker}>Catálogo</span>
          <h1>Aprenda novas habilidades com mentoria de IA.</h1>
          <p>
            Combine aulas em vídeo com acompanhamento inteligente. Explore
            trilhas, salve cursos para depois e evolua no seu ritmo.
          </p>
          <div className={styles.heroActions}>
            <Button variant="primary" size="large" onClick={() => router.push("/courses/create")}>
              Criar novo curso
            </Button>
            <Button variant="outline" size="large" onClick={() => router.push("/dashboard/student")}>
              Continuar aprendendo
            </Button>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div>
            <span>{courses.length}</span>
            <p>Cursos ativos</p>
          </div>
          <div>
            <span>{uniqueCreators}</span>
            <p>Mentores ativos</p>
          </div>
          <div>
            <span>
              {courses.length
                ? currencyFormatter.format(averagePrice)
                : "R$ 0,00"}
            </span>
            <p>Investimento médio</p>
          </div>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.filtersHeader}>
          <div>
            <p className={styles.filtersKicker}>Categorias populares</p>
            <h2>Descubra o que está em alta</h2>
          </div>
        </div>
        <div className={styles.filterChips}>
          {CATEGORY_FILTERS.map((category) => (
            <button
              key={category}
              className={`${styles.filterChip} ${
                selectedCategory === category ? styles.activeChip : ""
              }`}
              onClick={() => setSelectedCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>
          <p>Carregando cursos...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyCard}>
            <h3>Nenhum curso encontrado</h3>
            <p>
              Não encontramos resultados para “{selectedCategory}”. Experimente
              outra categoria ou remova o filtro.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.coursesGrid}>
          {filteredCourses.map((course, index) => (
            <article key={course.id} className={styles.courseCard}>
              <header className={styles.cardHeader}>
                <div className={styles.courseMeta}>
                  <span className={styles.courseTag}>
                    {course.creator?.username || "Mentoria AI"}
                  </span>
                  <span className={styles.coursePrice}>
                    {currencyFormatter.format(parseFloat(course.price))}
                  </span>
                </div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
              </header>

              <div className={styles.courseDetails}>
                <div>
                  <span className={styles.detailLabel}>Módulos</span>
                  <strong>{Math.max(1, (index % 4) + 3)}</strong>
                </div>
                <div>
                  <span className={styles.detailLabel}>Atualizado</span>
                  <strong>
                    {new Date(course.updatedAt).toLocaleDateString("pt-BR")}
                  </strong>
                </div>
                <div>
                  <span className={styles.detailLabel}>Duração estimada</span>
                  <strong>{Math.max(2, (index % 5) + 5)}h</strong>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleViewCourse(course.id)}
                >
                  Ver detalhes
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
