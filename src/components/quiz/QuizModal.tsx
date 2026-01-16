"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  Quiz,
  QuizQuestion,
  QuizResult,
  getQuizByVideoId,
  submitQuiz,
} from "@/services/quizzes";
import styles from "./QuizModal.module.css";

interface QuizModalProps {
  videoId: string;
  videoTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (passed: boolean) => void;
  isMandatory?: boolean;
}

export default function QuizModal({
  videoId,
  videoTitle,
  isOpen,
  onClose,
  onComplete,
  isMandatory = false,
}: QuizModalProps) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQuiz();
    }
  }, [isOpen, videoId]);

  const loadQuiz = async () => {
    setIsLoading(true);
    setResult(null);
    setCurrentQuestion(0);

    const quizData = await getQuizByVideoId(videoId);
    setQuiz(quizData);

    if (quizData) {
      setAnswers(new Array(quizData.questions.length).fill(null));
    }

    setIsLoading(false);
  };

  const handleSelectAnswer = (questionIndex: number, optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < (quiz?.questions.length || 0) - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!quiz) return;

    // Check if all questions are answered
    const unanswered = answers.findIndex((a) => a === null);
    if (unanswered !== -1) {
      setCurrentQuestion(unanswered);
      alert("Por favor, responda todas as perguntas antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    const submitResult = await submitQuiz(quiz.id, answers as number[]);
    setIsSubmitting(false);

    if ("error" in submitResult) {
      alert(submitResult.error);
      return;
    }

    setResult(submitResult);
    onComplete?.(submitResult.passed);
  };

  const handleClose = () => {
    if (isMandatory && !result) {
      alert("Este quiz é obrigatório. Envie suas respostas para continuar.");
      return;
    }
    setQuiz(null);
    setResult(null);
    setAnswers([]);
    setCurrentQuestion(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {(!isMandatory || result) && (
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Carregando quiz...</p>
          </div>
        ) : !quiz ? (
          <div className={styles.noQuiz}>
            <div className={styles.noQuizIcon}>📝</div>
            <h3>Nenhum quiz disponível</h3>
            <p>O criador ainda não gerou um quiz para esta aula.</p>
            <Button onClick={handleClose} variant="outline">
              Fechar
            </Button>
          </div>
        ) : result ? (
          // Results View
          <div className={styles.results}>
            <div
              className={`${styles.resultHeader} ${
                result.passed ? styles.passed : styles.failed
              }`}
            >
              <div className={styles.resultIcon}>
                {result.passed ? "🎉" : "😔"}
              </div>
              <h2>{result.passed ? "Parabéns!" : "Tente novamente"}</h2>
              <p className={styles.resultMessage}>{result.message}</p>
            </div>

            <div className={styles.scoreCard}>
              <div className={styles.scoreCircle}>
                <span className={styles.scoreValue}>{result.score}%</span>
              </div>
              <p>
                {result.correctCount} de {result.totalQuestions} corretas
              </p>
              <p className={styles.passingNote}>
                Pontuação mínima: {result.passingScore}%
              </p>
            </div>

            <div className={styles.resultsList}>
              <h4>Respostas:</h4>
              {result.results.map((r, index) => (
                <div
                  key={r.questionId}
                  className={`${styles.resultItem} ${
                    r.isCorrect ? styles.correct : styles.incorrect
                  }`}
                >
                  <div className={styles.resultQuestion}>
                    <span className={styles.resultNumber}>{index + 1}.</span>
                    {r.question}
                  </div>
                  <div className={styles.resultAnswer}>
                    <p>
                      <strong>Sua resposta:</strong> {r.options[r.userAnswer]}
                      {r.isCorrect ? " ✓" : " ✗"}
                    </p>
                    {!r.isCorrect && (
                      <p className={styles.correctAnswer}>
                        <strong>Resposta correta:</strong>{" "}
                        {r.options[r.correctAnswer]}
                      </p>
                    )}
                    {r.explanation && (
                      <p className={styles.explanation}>{r.explanation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.resultActions}>
              <Button onClick={loadQuiz} variant="outline">
                Tentar novamente
              </Button>
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          // Quiz View
          <>
            <div className={styles.header}>
              <h2>{quiz.title}</h2>
              <p className={styles.subtitle}>{videoTitle}</p>
            </div>

            {isMandatory && (
              <p className={styles.subtitle}>
                <strong>Quiz obrigatório:</strong> envie suas respostas para
                continuar.
              </p>
            )}

            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${
                      ((currentQuestion + 1) / quiz.questions.length) * 100
                    }%`,
                  }}
                />
              </div>
              <span className={styles.progressText}>
                Pergunta {currentQuestion + 1} de {quiz.questions.length}
              </span>
            </div>

            <div className={styles.questionCard}>
              <p className={styles.questionText}>
                {quiz.questions[currentQuestion].question}
              </p>

              <div className={styles.options}>
                {quiz.questions[currentQuestion].options.map(
                  (option, index) => (
                    <button
                      key={index}
                      className={`${styles.option} ${
                        answers[currentQuestion] === index
                          ? styles.selected
                          : ""
                      }`}
                      onClick={() => handleSelectAnswer(currentQuestion, index)}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={styles.optionText}>{option}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className={styles.navigation}>
              <Button
                onClick={handlePrev}
                variant="outline"
                disabled={currentQuestion === 0}
              >
                ← Anterior
              </Button>

              <div className={styles.questionDots}>
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.dot} ${
                      index === currentQuestion ? styles.activeDot : ""
                    } ${answers[index] !== null ? styles.answeredDot : ""}`}
                    onClick={() => setCurrentQuestion(index)}
                  />
                ))}
              </div>

              {currentQuestion === quiz.questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={answers.some((a) => a === null)}
                >
                  Enviar Respostas
                </Button>
              ) : (
                <Button onClick={handleNext}>Próxima →</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
