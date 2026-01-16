"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { getCourseById } from "@/services/courses";
import { createVideo, generateUploadUrl } from "@/services/videos";
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
import styles from "./page.module.css";

const addVideoSchema = z.object({
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

type AddVideoFormData = z.infer<typeof addVideoSchema>;

export default function AddVideoPage() {
  const { id: courseId } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuthStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<AddVideoFormData>({
    resolver: zodResolver(addVideoSchema),
  });

  // Verify user is creator and owns the course
  useEffect(() => {
    const verifyAccess = async () => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (user.role !== "creator") {
        toast.error("Apenas criadores podem adicionar vídeos");
        router.push(`/course/${courseId}`);
        return;
      }

      // Verify course ownership
      try {
        const course = await getCourseById(courseId);
        if (!course) {
          toast.error("Curso não encontrado");
          router.push("/courses");
          return;
        }

        if (course.creatorId !== user.id) {
          toast.error("Você só pode adicionar vídeos aos seus próprios cursos");
          router.push(`/course/${courseId}`);
          return;
        }

        setCheckingAccess(false);
      } catch (error) {
        console.error("Error verifying access:", error);
        toast.error("Erro ao verificar permissões");
        router.push(`/course/${courseId}`);
      }
    };

    verifyAccess();
  }, [user, courseId, router]);

  if (checkingAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.innerContainer}>
          <h1>Verificando permissões...</h1>
        </div>
      </div>
    );
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        toast.error("Por favor, selecione um arquivo de vídeo válido");
        return;
      }

      // No file size limit - Cloudflare R2 supports files of any size
      // Browser limit is typically ~2GB, which is more than enough for video lessons

      setSelectedFile(file);

      // Auto-fill title from filename if not set
      const currentTitle = watch("title");
      if (!currentTitle) {
        const filename = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setValue("title", filename);
      }
    }
  };

  const onSubmit = async (data: AddVideoFormData) => {
    if (!selectedFile) {
      toast.error("Por favor, selecione um arquivo de vídeo");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Step 1: Get presigned URL for direct upload to R2
      toast.info("Preparando upload...");
      const uploadUrlData = await generateUploadUrl(
        selectedFile.name,
        selectedFile.type
      );

      // Step 2: Upload directly to R2 using presigned URL
      toast.info("Fazendo upload do vídeo... (isso pode levar alguns minutos)");

      // Use XMLHttpRequest for progress tracking
      const uploadPromise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener("load", () => {
          // R2 returns 200 on successful PUT upload
          if (xhr.status === 200 || xhr.status === 204) {
            resolve(uploadUrlData.key);
          } else {
            reject(
              new Error(
                `Upload failed with status ${xhr.status}: ${xhr.statusText}`
              )
            );
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed due to network error"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"));
        });

        // Use PUT method with presigned URL (R2/S3 compatible)
        xhr.open("PUT", uploadUrlData.uploadUrl);
        xhr.setRequestHeader("Content-Type", selectedFile.type);
        // Don't set Content-Length, browser will handle it
        xhr.send(selectedFile);
      });

      const r2Key = await uploadPromise;
      toast.success("Upload concluído!");

      // Step 3: Create video record in database
      toast.info("Salvando informações do vídeo...");
      await createVideo({
        courseId,
        title: data.title,
        r2Key: r2Key,
        duration: data.duration,
      });

      toast.success("Vídeo adicionado com sucesso!");
      router.push(`/course/${courseId}`);
    } catch (error: any) {
      console.error("Error adding video:", error);

      // Check if it's a CORS error
      if (
        error.message?.includes("CORS") ||
        error.message?.includes("blocked by CORS") ||
        error.message?.includes("Access-Control-Allow-Origin") ||
        error.message?.includes("network error") ||
        error.message?.includes("ERR_FAILED")
      ) {
        toast.error(
          "Erro de CORS: Configure a política CORS do Cloudflare R2 para permitir PUT requests. Veja api/CORS_SETUP.md para instruções detalhadas.",
          { duration: 10000 }
        );
      } else {
        toast.error(error.message || "Erro ao adicionar vídeo");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    router.push(`/course/${courseId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Header */}
        <div className={styles.header}>
          <Button onClick={handleCancel} variant="outline" size="small">
            ← Voltar ao Curso
          </Button>
          <h1 className={styles.title}>Adicionar Novo Vídeo</h1>
        </div>

        {/* Form */}
        <Card variant="elevated" className={styles.formCard}>
          <CardHeader>
            <CardTitle>Informações do Vídeo</CardTitle>
            <p className={styles.subtitle}>
              Faça upload de um novo vídeo para o curso
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
              {/* File Upload */}
              <div className={styles.formGroup}>
                <Label htmlFor="video-file">Arquivo de Vídeo</Label>
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
                        <p>Clique para selecionar um arquivo de vídeo</p>
                        <p className={styles.uploadHint}>
                          Formatos suportados: MP4, MOV, AVI (sem limite de
                          tamanho)
                        </p>
                      </div>
                    )}
                  </div>
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
                  <p className={styles.errorMessage}>
                    <span>⚠</span>
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div className={styles.formGroup}>
                <Label htmlFor="duration">Duração (segundos) - Opcional</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="Ex: 300 (para 5 minutos)"
                  {...register("duration", {
                    setValueAs: (value) =>
                      value === "" ? undefined : parseInt(value),
                  })}
                />
                {errors.duration && (
                  <p className={styles.errorMessage}>
                    <span>⚠</span>
                    {errors.duration.message}
                  </p>
                )}
                <p className={styles.fieldHint}>
                  Se não informado, será detectado automaticamente durante o
                  processamento
                </p>
              </div>

              {/* Submit Buttons */}
              <div className={styles.submitButtons}>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  disabled={isSubmitting || uploading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting || uploading}
                  disabled={!selectedFile}
                >
                  {uploading ? "Fazendo upload..." : "Adicionar Vídeo"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploading && (
          <Card variant="default" className={styles.progressCard}>
            <CardContent>
              <div className={styles.progressInfo}>
                <div className={styles.progressIcon}>⏳</div>
                <div style={{ flex: 1 }}>
                  <p className={styles.progressTitle}>
                    Fazendo upload do vídeo... {Math.round(uploadProgress)}%
                  </p>
                  <div className={styles.progressBarContainer}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className={styles.progressText}>
                    {uploadProgress < 100
                      ? "Isso pode levar alguns minutos dependendo do tamanho do arquivo"
                      : "Finalizando..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
