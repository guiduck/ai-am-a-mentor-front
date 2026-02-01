"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button/Button";
import {
  generateQuiz,
  getQuizByVideoId,
  getQuizCostEstimate,
  deleteQuiz,
} from "@/services/quizzes";
import styles from "./GenerateQuizButton.module.css";

interface GenerateQuizButtonProps {
  videoId: string;
  videoTitle: string;
  hasTranscript: boolean;
  onQuizGenerated?: () => void;
  onTestQuiz?: () => void;
}

export default function GenerateQuizButton({
  videoId,
  videoTitle,
  hasTranscript,
  onQuizGenerated,
  onTestQuiz,
}: GenerateQuizButtonProps) {
  const [hasQuiz, setHasQuiz] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [estimatedCost, setEstimatedCost] = useState(1);

  useEffect(() => {
    checkExistingQuiz();
    updateCostEstimate(numQuestions);
  }, [videoId]);

  const checkExistingQuiz = async () => {
    setIsLoading(true);
    const quiz = await getQuizByVideoId(videoId);
    setHasQuiz(!!quiz);
    setIsLoading(false);
  };

  const updateCostEstimate = async (questions: number) => {
    const { estimatedCost } = await getQuizCostEstimate(questions);
    setEstimatedCost(estimatedCost);
  };

  const handleGenerateClick = () => {
    if (!hasTranscript) {
      alert(
        "O vídeo precisa ter uma transcrição para gerar o quiz. Aguarde a transcrição automática."
      );
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    setIsGenerating(true);
    setShowConfirm(false);

    const result = await generateQuiz(videoId, numQuestions);

    setIsGenerating(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    alert(
      `Quiz gerado com sucesso! ${result.questionsCount} perguntas criadas. Custo: ${result.creditsUsed} créditos.`
    );
    setHasQuiz(true);
    onQuizGenerated?.();
  };

  const handleDeleteQuiz = async () => {
    if (
      !confirm(
        "Tem certeza que deseja deletar o quiz? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    const quiz = await getQuizByVideoId(videoId);
    if (quiz) {
      const result = await deleteQuiz(quiz.id);
      if (result.error) {
        alert(result.error);
        return;
      }
      setHasQuiz(false);
      alert("Quiz deletado com sucesso!");
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <span className={styles.loadingText}>Verificando quiz...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {hasQuiz ? (
        <div className={styles.hasQuiz}>
          <span className={styles.quizBadge}>✓ Quiz disponível</span>
          <div className={styles.actions}>
            {onTestQuiz && (
              <Button
                size="small"
                variant="primary"
                onClick={onTestQuiz}
                disabled={isGenerating}
              >
                Testar quiz
              </Button>
            )}
            <Button
              size="small"
              variant="outline"
              onClick={handleGenerateClick}
              disabled={isGenerating}
            >
              Regenerar
            </Button>
            <Button size="small" variant="ghost" onClick={handleDeleteQuiz}>
              Deletar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={handleGenerateClick}
          loading={isGenerating}
          disabled={!hasTranscript}
          variant="dark"
        >
          🧠 Gerar Quiz com IA
        </Button>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowConfirm(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3>Gerar Quiz com IA</h3>
            <p className={styles.modalDescription}>
              O quiz será gerado automaticamente baseado na transcrição do
              vídeo.
            </p>

            <div className={styles.formGroup}>
              <label>Número de perguntas:</label>
              <select
                value={numQuestions}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setNumQuestions(val);
                  updateCostEstimate(val);
                }}
                className={styles.select}
              >
                <option value={3}>3 perguntas</option>
                <option value={5}>5 perguntas</option>
                <option value={7}>7 perguntas</option>
                <option value={10}>10 perguntas</option>
              </select>
            </div>

            <div className={styles.costInfo}>
              <span className={styles.costLabel}>Custo estimado:</span>
              <span className={styles.costValue}>{estimatedCost} créditos</span>
            </div>

            {hasQuiz && (
              <p className={styles.warning}>
                ⚠️ O quiz existente será substituído.
              </p>
            )}

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmGenerate} loading={isGenerating}>
                Gerar Quiz
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
