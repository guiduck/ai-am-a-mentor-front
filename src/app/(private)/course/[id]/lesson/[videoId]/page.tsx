"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getVideoById, Video, getVideoStreamUrl } from "@/services/videos";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        toast.error("Não foi possível carregar o vídeo. Verifique se o vídeo foi enviado.");
      }
      setLoadingStream(false);

      // Check if transcript exists
      await checkTranscript();
    } catch (error) {
      console.error("Error loading lesson data:", error);
      toast.error("Erro ao carregar aula");
      router.push(`/course/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCourse = () => {
    router.push(`/course/${courseId}`);
  };

  const checkTranscript = async () => {
    try {
      const transcript = await getVideoTranscript(videoId);
      if (transcript) {
        setHasTranscript(true);
      }
    } catch (error) {
      console.error("Error checking transcript:", error);
    }
  };

  const handleTranscribe = async () => {
    if (isTranscribing) return;

    setIsTranscribing(true);
    try {
      const result = await transcribeVideo(videoId);
      if (result) {
        setHasTranscript(true);
        toast.success("Vídeo transcrito com sucesso! Agora você pode fazer perguntas.");
      } else {
        toast.error("Erro ao transcrever vídeo. Tente novamente.");
      }
    } catch (error) {
      console.error("Error transcribing:", error);
      toast.error("Erro ao transcrever vídeo");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAskQuestion = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!question.trim() || isAsking) return;

    if (!hasTranscript) {
      toast.error("Este vídeo ainda não foi transcrito. Por favor, transcreva primeiro.");
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
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando aula...</div>
      </div>
    );
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
                    <p>Carregando vídeo...</p>
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
              </CardContent>
            </Card>
          </div>

          {/* AI Mentor Chat Section */}
          <div className={styles.chatSection}>
            <Card variant="elevated" className={styles.chatCard}>
              <CardHeader>
                <CardTitle className={styles.chatTitle}>
                  🤖 Mentor de IA
                </CardTitle>
                <p className={styles.chatSubtitle}>
                  Tire suas dúvidas sobre esta aula
                </p>
              </CardHeader>
              <CardContent className={styles.chatContent}>
                <div className={styles.chatContainer}>
                  {/* Transcript status */}
                  {!hasTranscript && (
                    <div className={styles.transcriptPrompt}>
                      <p>
                        Para usar o mentor de IA, primeiro é necessário transcrever
                        o vídeo.
                      </p>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleTranscribe}
                        disabled={isTranscribing}
                      >
                        {isTranscribing ? "Transcrevendo..." : "Transcrever vídeo"}
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
                          <p className={styles.typingIndicator}>
                            Pensando...
                          </p>
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
      </div>
    </div>
  );
}
