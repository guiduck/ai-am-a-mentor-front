"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import {
  getVideoById,
  Video,
  getVideoStreamUrl,
  getVideoComments,
  createComment,
  Comment,
} from "@/services/videos";
import { getCourseById, Course } from "@/services/courses";
import {
  askAIMentor,
  getVideoTranscript,
  transcribeVideo,
} from "@/services/ai-chat";
import { Button } from "@/components/ui/Button/Button";
import VideoPlayer from "@/components/ui/VideoPlayer/VideoPlayer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import { toast } from "sonner";
import { FullPageLoading, Loading } from "@/components/ui/Loading/Loading";
import styles from "./page.module.css";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function LessonPage() {
  const { id: courseId, videoId } = useParams() as {
    id: string;
    videoId: string;
  };
  const { user } = useAuthStore();
  const router = useRouter();

  const [video, setVideo] = useState<Video | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);

  // AI Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou seu mentor de IA. Estou aqui para ajudar você com qualquer dúvida sobre esta aula. Posso explicar conceitos, esclarecer pontos específicos do vídeo ou ajudar com exercícios relacionados ao conteúdo.",
      timestamp: new Date(),
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (courseId && videoId && user) {
      loadLessonData();
    }
  }, [courseId, videoId, user]);

  const loadLessonData = async () => {
    try {
      setLoading(true);

      // Load video and course data in parallel
      const [videoData, courseData] = await Promise.all([
        getVideoById(videoId),
        getCourseById(courseId),
      ]);

      if (!videoData) {
        toast.error("Vídeo não encontrado");
        router.push(`/course/${courseId}`);
        return;
      }

      if (!courseData) {
        toast.error("Curso não encontrado");
        router.push("/courses");
        return;
      }

      setVideo(videoData);
      setCourse(courseData);

      // Load streaming URL for the video
      setLoadingStream(true);
      const streamData = await getVideoStreamUrl(videoId);
      if (streamData) {
        console.log("Stream URL received:", streamData.streamUrl);
        setStreamUrl(streamData.streamUrl);
      } else {
        console.error("Failed to get stream URL for video:", videoId);
        toast.error(
          "Não foi possível carregar o vídeo. Verifique se o vídeo foi enviado."
        );
      }
      setLoadingStream(false);

      // Check if transcript exists
      const transcriptExists = await checkTranscript();
      
      // Auto-transcribe if no transcript exists (only for creators)
      if (!transcriptExists && user?.role === "creator") {
        // Auto-start transcription in background (silent)
        handleAutoTranscribe();
      }

      // Load comments
      await loadComments();
    } catch (error) {
      console.error("Error loading lesson data:", error);
      toast.error("Erro ao carregar aula");
      router.push(`/course/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const commentsData = await getVideoComments(videoId);
      setComments(commentsData);
    } catch (error) {
      console.error("Error loading comments:", error);
      // Don't show error toast, comments are optional
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const newCommentData = await createComment(videoId, newComment.trim());
      setComments([newCommentData, ...comments]);
      setNewComment("");
      toast.success("Comentário adicionado!");
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      toast.error(error.message || "Erro ao adicionar comentário");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleBackToCourse = () => {
    router.push(`/course/${courseId}`);
  };

  const checkTranscript = async (): Promise<boolean> => {
    try {
      const transcript = await getVideoTranscript(videoId);
      if (transcript) {
        setHasTranscript(true);
        return true;
      }
      setHasTranscript(false);
      return false;
    } catch (error) {
      console.error("Error checking transcript:", error);
      setHasTranscript(false);
      return false;
    }
  };

  const handleAutoTranscribe = async () => {
    // Auto-transcribe silently in background (no toast, no blocking)
    try {
      await transcribeVideo(videoId);
      // Poll for transcript after a delay
      setTimeout(async () => {
        await checkTranscript();
      }, 10000); // Check after 10 seconds
    } catch (error) {
      console.error("Error auto-transcribing:", error);
      // Silent fail - user can still manually transcribe
    }
  };

  const handleTranscribe = async () => {
    if (isTranscribing) return;

    setIsTranscribing(true);
    const loadingToast = toast.loading(
      "Iniciando transcrição... Isso pode levar alguns minutos."
    );

    try {
      const result = await transcribeVideo(videoId);
      if (result) {
        toast.dismiss(loadingToast);
        setHasTranscript(true);
        setMessages([
          {
            id: "ai-intro",
            role: "assistant",
            content:
              "Olá! Sou seu mentor de IA. O vídeo foi transcrito com sucesso! Agora você pode fazer perguntas.",
            timestamp: new Date(),
          },
        ]);
        toast.success(
          "Vídeo transcrito com sucesso! Agora você pode fazer perguntas."
        );
      } else {
        toast.dismiss(loadingToast);
        toast.error("Erro ao transcrever vídeo. Tente novamente.");
      }
    } catch (error: any) {
      console.error("Error transcribing:", error);
      toast.dismiss(loadingToast);
      toast.error(
        error.message ||
          "Erro ao transcrever vídeo. Verifique se o FFmpeg está instalado no servidor.",
        { duration: 8000 }
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!question.trim() || isAsking) return;

    if (!hasTranscript) {
      toast.error(
        "Este vídeo ainda não foi transcrito. Por favor, transcreva primeiro."
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsAsking(true);

    try {
      const response = await askAIMentor(videoId, question.trim());
      if (response) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error("Erro ao obter resposta do mentor de IA");
        setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
      }
    } catch (error) {
      console.error("Error asking AI:", error);
      toast.error("Erro ao obter resposta do mentor de IA");
      setMessages((prev) => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setIsAsking(false);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return <FullPageLoading text="Carregando aula..." />;
  }

  if (!video || !course) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Aula não encontrada</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        {/* Navigation Header */}
        <div className={styles.navigation}>
          <Button onClick={handleBackToCourse} variant="outline" size="small">
            ← Voltar ao Curso
          </Button>
          <div className={styles.breadcrumb}>
            <span className={styles.courseName}>{course.title}</span>
            <span className={styles.separator}>•</span>
            <span className={styles.lessonName}>{video.title}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Video Player Section */}
          <div className={styles.videoSection}>
            <Card variant="elevated" className={styles.videoCard}>
              <CardContent className={styles.videoContent}>
                {/* Video Player */}
                <VideoPlayer
                  src={streamUrl || undefined}
                  title={video.title}
                  onLoadStart={() => console.log("Video loading started")}
                  onLoadedData={() => console.log("Video loaded")}
                  onError={(error) => {
                    console.error("Video player error:", error);
                    toast.error("Erro ao reproduzir vídeo");
                  }}
                />

                {loadingStream && (
                  <div className={styles.streamLoading}>
                    <Loading text="Carregando vídeo..." size="small" />
                  </div>
                )}

                {/* Video Title */}
                <div className={styles.videoHeader}>
                  <h1 className={styles.videoTitle}>{video.title}</h1>
                  <div className={styles.videoMeta}>
                    <span className={styles.uploadDate}>
                      Publicado em{" "}
                      {new Date(video.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {video.duration && (
                      <span className={styles.videoDuration}>
                        Duração: {Math.floor(video.duration / 60)}:
                        {(video.duration % 60).toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comments Section - Moved inside video card */}
                <div className={styles.commentsSection}>
                  <CardHeader>
                    <CardTitle>Comentários dos Alunos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Comment Form */}
                    <form
                      onSubmit={handleSubmitComment}
                      className={styles.commentForm}
                    >
                      <textarea
                        className={styles.commentInput}
                        placeholder="Deixe seu comentário sobre esta aula..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={submittingComment}
                        rows={3}
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="small"
                        disabled={!newComment.trim() || submittingComment}
                      >
                        {submittingComment ? "Enviando..." : "Enviar Comentário"}
                      </Button>
                    </form>

                    {/* Comments List */}
                    {loadingComments ? (
                      <Loading text="Carregando comentários..." />
                    ) : comments.length === 0 ? (
                      <p className={styles.noComments}>
                        Nenhum comentário ainda. Seja o primeiro a comentar!
                      </p>
                    ) : (
                      <div className={styles.commentsList}>
                        {comments.map((comment) => (
                          <div key={comment.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                              <strong className={styles.commentAuthor}>
                                {comment.user?.username || "Usuário"}
                              </strong>
                              <span className={styles.commentDate}>
                                {new Date(comment.createdAt).toLocaleDateString(
                                  "pt-BR",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                            <p className={styles.commentContent}>{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Progress Section */}
        <div className={styles.progressSection}>
          <Card variant="default">
            <CardHeader>
              <CardTitle>Progresso do Curso</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.progressNote}>
                Sistema de progresso será implementado em breve
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Floating AI Chat Button */}
        <button
          className={styles.chatToggleButton}
          onClick={() => setIsChatOpen(!isChatOpen)}
          aria-label="Abrir chat do mentor de IA"
        >
          {isChatOpen ? "✕" : "🤖"}
        </button>

        {/* AI Mentor Chat Section - Floating */}
        {isChatOpen && (
          <div className={styles.chatFloatingContainer}>
            <Card variant="elevated" className={styles.chatCard}>
              <CardHeader>
                <div className={styles.chatHeaderContent}>
                  <div>
                    <CardTitle className={styles.chatTitle}>
                      🤖 Mentor de IA
                    </CardTitle>
                    <p className={styles.chatSubtitle}>
                      Tire suas dúvidas sobre esta aula
                    </p>
                  </div>
                  <button
                    className={styles.chatCloseButton}
                    onClick={() => setIsChatOpen(false)}
                    aria-label="Fechar chat"
                  >
                    ✕
                  </button>
                </div>
              </CardHeader>
              <CardContent className={styles.chatContent}>
                <div className={styles.chatContainer}>
                  {/* Transcript status */}
                  {!hasTranscript && (
                    <div className={styles.transcriptPrompt}>
                      <p>
                        Para usar o mentor de IA, primeiro é necessário
                        transcrever o vídeo.
                      </p>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                      >
                        {isTranscribing
                          ? "Transcrevendo..."
                          : "Transcrever vídeo"}
                      </Button>
                    </div>
                  )}

                  {/* Chat messages */}
                  <div className={styles.chatMessages}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={
                          message.role === "user"
                            ? styles.userMessage
                            : styles.mentorMessage
                        }
                      >
                        <div className={styles.messageAvatar}>
                          {message.role === "user" ? "👤" : "🤖"}
                        </div>
                        <div className={styles.messageContent}>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {isAsking && (
                      <div className={styles.mentorMessage}>
                        <div className={styles.messageAvatar}>🤖</div>
                        <div className={styles.messageContent}>
                          <p className={styles.typingIndicator}>Pensando...</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat input */}
                  <form
                    onSubmit={handleAskQuestion}
                    className={styles.chatInput}
                  >
                    <input
                      type="text"
                      placeholder="Digite sua pergunta sobre a aula..."
                      className={styles.messageInput}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      disabled={!hasTranscript || isAsking}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="small"
                      disabled={!hasTranscript || isAsking || !question.trim()}
                    >
                      {isAsking ? "Enviando..." : "Enviar"}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
