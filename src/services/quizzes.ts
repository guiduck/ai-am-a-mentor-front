/**
 * Quiz Service (Frontend)
 * Handles quiz generation, retrieval, and submissions
 */

import api from "@/lib/api";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  order: number;
  // Only for creators
  correctAnswer?: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  passingScore: number;
  questionsCount: number;
  questions: QuizQuestion[];
  bestAttempt?: {
    score: number;
    passed: boolean;
    completedAt: string;
  } | null;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  passingScore: number;
  correctCount: number;
  totalQuestions: number;
  message: string;
  results: {
    questionId: string;
    question: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
    options: string[];
  }[];
}

export interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  completedAt: string;
}

/**
 * Generate a quiz for a video using AI
 */
export async function generateQuiz(
  videoId: string,
  numQuestions: number = 5
): Promise<{
  quizId?: string;
  questionsCount?: number;
  creditsUsed?: number;
  error?: string;
}> {
  const response = await api<{
    message: string;
    quizId: string;
    questionsCount: number;
    creditsUsed: number;
  }>("quizzes/generate", {
    method: "POST",
    data: { videoId, numQuestions },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao gerar quiz" };
  }

  return {
    quizId: response.data?.quizId,
    questionsCount: response.data?.questionsCount,
    creditsUsed: response.data?.creditsUsed,
  };
}

/**
 * Get quiz for a specific video
 */
export async function getQuizByVideoId(videoId: string): Promise<Quiz | null> {
  const response = await api<Quiz>(`quizzes/video/${videoId}`);

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
  answers: number[]
): Promise<QuizResult | { error: string }> {
  const response = await api<QuizResult>(`quizzes/${quizId}/submit`, {
    method: "POST",
    data: { answers },
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao enviar respostas" };
  }

  return response.data!;
}

/**
 * Get user's quiz attempts
 */
export async function getQuizAttempts(quizId: string): Promise<{
  attempts: QuizAttempt[];
  totalAttempts: number;
  bestScore: number | null;
}> {
  const response = await api<{
    attempts: QuizAttempt[];
    totalAttempts: number;
    bestScore: number | null;
  }>(`quizzes/${quizId}/attempts`);

  if (response.error) {
    return { attempts: [], totalAttempts: 0, bestScore: null };
  }

  return response.data!;
}

/**
 * Delete a quiz (creator only)
 */
export async function deleteQuiz(quizId: string): Promise<{ error?: string }> {
  const response = await api(`quizzes/${quizId}`, {
    method: "DELETE",
  });

  if (response.error) {
    return { error: response.errorUserMessage || "Erro ao deletar quiz" };
  }

  return {};
}

/**
 * Get estimated credit cost for quiz generation
 */
export async function getQuizCostEstimate(
  numQuestions: number = 5
): Promise<{ estimatedCost: number }> {
  const response = await api<{ numQuestions: number; estimatedCost: number }>(
    `quizzes/estimate-cost?numQuestions=${numQuestions}`
  );

  if (response.error) {
    return { estimatedCost: 1 };
  }

  return { estimatedCost: response.data?.estimatedCost || 1 };
}
