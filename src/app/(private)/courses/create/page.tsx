"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCourse } from "@/actions/courses";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import styles from "./page.module.css";
import { toast } from "sonner";

const AVAILABLE_TAGS = [
  "Programação",
  "Design",
  "IA",
  "Marketing",
  "Produtividade",
  "Negócios",
  "Fotografia",
  "Vídeo",
  "Música",
  "Escrita",
  "Idiomas",
  "Saúde",
  "Fitness",
  "Culinária",
  "Arte",
];

const schema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  price: z.number().min(0, "Preço deve ser maior ou igual a zero"),
  tags: z.array(z.string()).optional().default([]),
});

type FormData = z.infer<typeof schema>;

export default function CreateCoursePage() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tags: [],
    },
  });

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    setValue("tags", newTags);
  };

  const onSubmit = async (data: FormData) => {
    const result = await createCourse({ ...data, tags: selectedTags });

    if (result?.error) {
      toast.error(result.errorUserMessage);
      return;
    }

    toast.success("Curso criado com sucesso!");
    router.push("/dashboard/creator");
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1>Criar Novo Curso</h1>
          <p>Crie um curso incrível com mentoria de IA</p>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Informações do Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              <div className={styles.formGroup}>
                <Label htmlFor="title">Título do Curso</Label>
                <Input
                  id="title"
                  placeholder="Ex: Introdução ao JavaScript"
                  {...register("title")}
                />
                {errors.title && (
                  <p className={styles.error}>
                    <span>⚠</span>
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  className={styles.textarea}
                  placeholder="Descreva o que os alunos vão aprender neste curso..."
                  rows={4}
                  {...register("description")}
                />
                {errors.description && (
                  <p className={styles.error}>
                    <span>⚠</span>
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="99.90"
                  {...register("price", { valueAsNumber: true })}
                />
                {errors.price && (
                  <p className={styles.error}>
                    <span>⚠</span>
                    {errors.price.message}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <Label htmlFor="tags">Tags/Categorias</Label>
                <p className={styles.helperText}>
                  Selecione as tags que melhor descrevem seu curso
                </p>
                <div className={styles.tagsContainer}>
                  {AVAILABLE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.tagChip} ${
                        selectedTags.includes(tag) ? styles.tagChipActive : ""
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                {selectedTags.length === 0 && (
                  <p className={styles.helperText}>
                    Nenhuma tag selecionada (opcional)
                  </p>
                )}
              </div>

              <div className={styles.formActions}>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  variant="outline"
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Curso"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
