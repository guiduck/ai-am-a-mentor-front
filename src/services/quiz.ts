/**
 * Quiz Service (Frontend)
 * Handles quiz generation, retrieval, and submission
 */

import api from "@/lib/api";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  order: number;
}

export interface Quiz {
  id: string;
  videoId: string;
  title: string;
  description: string;
  passingScore: number;
  questionsCount: number;
  questions: QuizQuestion[];
}

export interface QuizResult {
  questionId: string;
  correct: boolean;
  selectedOption: number;
  correctOption: number;
  explanation: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  results: QuizResult[];
}

export interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

export interface QuizProgress {
  videoId: string;
  videoTitle: string;
  hasQuiz: boolean;
  quizId: string | null;
  bestScore: number | null;
  passed: boolean;
}

export interface CourseQuizProgress {
  progress: QuizProgress[];
  totalQuizzes: number;
  passedQuizzes: number;
  allPassed: boolean;
}

/**
 * Generate a quiz for a video (creator only)
 */
export async function generateQuiz(
  videoId: string,
  numberOfQuestions: number = 5
): Promise<{
  quizId?: string;
  questionsCount?: number;
  creditsUsed?: number;
  error?: string;
}> {
  const response = await api<{
    quizId: string;
    questionsCount: number;
    creditsUsed: number;
  }>("quiz/generate", {
    method: "POST",
    data: { videoId, numberOfQuestions },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao gerar quiz" };
  }

  return response.data || {};
}

/**
 * Get quiz generation cost
 */
export async function getQuizCost(): Promise<number> {
  const response = await api<{ cost: number }>("quiz/cost");
  return response.data?.cost || 50;
}

/**
 * Get quiz for a video
 */
export async function getQuizByVideoId(videoId: string): Promise<Quiz | null> {
  const response = await api<Quiz>(`quiz/video/${videoId}`, {
    skipAuthRedirect: true, // Don't redirect on 404
  });

  if (response.error) {
    return null;
  }

  return response.data;
}

/**
 * Get quiz by ID
 */
export async function getQuizById(quizId: string): Promise<Quiz | null> {
  const response = await api<Quiz>(`quiz/${quizId}`);

  if (response.error) {
    return null;
  }

  return response.data;
}

/**
 * Submit quiz answers
 */
export async function submitQuiz(
  quizId: string,
  answers: Array<{ questionId: string; selectedOption: number }>
): Promise<QuizSubmissionResult | null> {
  const response = await api<QuizSubmissionResult>(`quiz/${quizId}/submit`, {
    method: "POST",
    data: { answers },
  });

  if (response.error) {
    console.error("Quiz submission error:", response.errorUserMessage);
    return null;
  }

  return response.data;
}

/**
 * Get user's attempts for a quiz
 */
export async function getQuizAttempts(quizId: string): Promise<{
  attempts: QuizAttempt[];
  bestScore: number | null;
  hasPassed: boolean;
} | null> {
  const response = await api<{
    attempts: QuizAttempt[];
    bestScore: number | null;
    hasPassed: boolean;
  }>(`quiz/${quizId}/attempts`);

  if (response.error) {
    return null;
  }

  return response.data;
}

/**
 * Get quiz progress for a course
 */
export async function getCourseQuizProgress(
  courseId: string
): Promise<CourseQuizProgress | null> {
  const response = await api<CourseQuizProgress>(`quiz/course/${courseId}/progress`);

  if (response.error) {
    return null;
  }

  return response.data;
}

/**
 * Delete a quiz (creator only)
 */
export async function deleteQuiz(quizId: string): Promise<{ success: boolean; error?: string }> {
  const response = await api(`quiz/${quizId}`, {
    method: "DELETE",
  });

  if (response.error) {
    return { success: false, error: response.errorUserMessage };
  }

  return { success: true };
}

