"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { getCourseById } from "@/services/courses";
import { getVideoById, updateVideo, generateUploadUrl } from "@/services/videos";
import API from "@/lib/api";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FullPageLoading } from "@/components/ui/Loading";
import styles from "./page.module.css";

const editVideoSchema = z.object({
  title: z
    .string()
    .min(1, "Título é obrigatório")
    .max(255, "Título muito longo"),
  duration: z
    .number()
    .int()
    .positive("Duração deve ser um número positivo")
    .optional(),
});

type EditVideoFormData = z.infer<typeof editVideoSchema>;

export default function EditVideoPage() {
  const { id: courseId, videoId } = useParams() as { id: string; videoId: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EditVideoFormData>({
    resolver: zodResolver(editVideoSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [courseData, videoData] = await Promise.all([
          getCourseById(courseId),
          getVideoById(videoId),
        ]);

        if (!courseData) {
          toast.error("Curso não encontrado");
          router.push("/courses");
          return;
        }

        if (!videoData) {
          toast.error("Vídeo não encontrado");
          router.push(`/course/${courseId}`);
          return;
        }

        // Check if user is the creator
        if (user?.role !== "creator" || courseData.creatorId !== user.id) {
          toast.error("Você não tem permissão para editar este vídeo");
          router.push(`/course/${courseId}`);
          return;
        }

        setCourse(courseData);
        setVideo(videoData);
        setValue("title", videoData.title);
        if (videoData.duration) {
          setValue("duration", videoData.duration);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar dados");
        router.push(`/course/${courseId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, videoId, user, router, setValue]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const onSubmit = async (data: EditVideoFormData) => {
    if (!video || !course) return;

    try {
      setUploading(true);

      let r2Key = video.r2Key;

      // If a new file is selected, upload it
      if (selectedFile) {
        // Get upload URL
        const uploadUrlResponse = await generateUploadUrl(
          selectedFile.name,
          selectedFile.type
        );

        if (!uploadUrlResponse?.uploadUrl) {
          throw new Error("Failed to get upload URL");
        }

        // Upload file directly to R2
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setUploadProgress(percentComplete);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed due to network error"));
          });

          xhr.open("PUT", uploadUrlResponse.uploadUrl);
          xhr.setRequestHeader("Content-Type", selectedFile.type);
          xhr.send(selectedFile);
        });

        r2Key = uploadUrlResponse.key;
      }

      // Update video
      await updateVideo(videoId, {
        title: data.title,
        duration: data.duration,
        r2Key: selectedFile ? r2Key : undefined,
      });

      toast.success("Vídeo atualizado com sucesso!");
      router.push(`/course/${courseId}`);
    } catch (error: any) {
      console.error("Error updating video:", error);
      toast.error(error.message || "Erro ao atualizar vídeo");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    router.push(`/course/${courseId}`);
  };

  if (loading) {
    return <FullPageLoading text="Carregando vídeo..." />;
  }

  if (!video || !course) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <Button onClick={handleCancel} variant="outline" size="small">
            ← Voltar ao Curso
          </Button>
          <h1 className={styles.title}>Editar Vídeo</h1>
        </div>

        {/* Form */}
        <Card variant="elevated" className={styles.formCard}>
          <CardHeader>
            <CardTitle>Informações do Vídeo</CardTitle>
            <p className={styles.subtitle}>
              Atualize as informações do vídeo ou substitua o arquivo
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {/* File Upload */}
              <div className={styles.formGroup}>
                <Label htmlFor="video-file">
                  Arquivo de Vídeo (opcional - deixe em branco para manter o atual)
                </Label>
                <div className={styles.fileUpload}>
                  <input
                    id="video-file"
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className={styles.fileInput}
                  />
                  <div className={styles.fileUploadArea}>
                    {selectedFile ? (
                      <div className={styles.selectedFile}>
                        <div className={styles.fileIcon}>📹</div>
                        <div className={styles.fileInfo}>
                          <p className={styles.fileName}>{selectedFile.name}</p>
                          <p className={styles.fileSize}>
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.uploadPrompt}>
                        <div className={styles.uploadIcon}>📁</div>
                        <p>Clique para selecionar um novo arquivo de vídeo</p>
                        <p className={styles.uploadHint}>
                          Deixe em branco para manter o vídeo atual
                        </p>
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Video Title */}
              <div className={styles.formGroup}>
                <Label htmlFor="title">Título do Vídeo</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Digite o título da aula"
                  {...register("title")}
                />
                {errors.title && (
                  <span className={styles.error}>{errors.title.message}</span>
                )}
              </div>

              {/* Duration (optional) */}
              <div className={styles.formGroup}>
                <Label htmlFor="duration">
                  Duração (segundos) - Opcional
                </Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Ex: 3600 (para 1 hora)"
                  {...register("duration", { valueAsNumber: true })}
                />
                {errors.duration && (
                  <span className={styles.error}>
                    {errors.duration.message}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className={styles.actions}>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={uploading}>
                  {uploading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


