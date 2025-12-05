"use client";

import styles from "./Loading.module.css";

export interface LoadingProps {
  /**
   * Size of the spinner
   * @default "medium"
   */
  size?: "small" | "medium" | "large";
  /**
   * Optional text to display below the spinner
   */
  text?: string;
  /**
   * Full page loading overlay
   * @default false
   */
  fullPage?: boolean;
  /**
   * Inline loading (for buttons, small areas)
   * @default false
   */
  inline?: boolean;
  /**
   * Custom className
   */
  className?: string;
}

/**
 * Loading component with spinner
 * 
 * @example
 * <Loading text="Carregando..." />
 * <Loading fullPage text="Carregando curso..." />
 * <Loading inline size="small" />
 */
export function Loading({
  size = "medium",
  text,
  fullPage = false,
  inline = false,
  className = "",
}: LoadingProps) {
  const containerClass = fullPage
    ? styles.fullPage
    : inline
    ? styles.inline
    : styles.container;

  return (
    <div className={`${containerClass} ${className}`}>
      <div className={`${styles.spinner} ${styles[size]}`} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function Skeleton({
  width = "100%",
  height = "1rem",
  className = "",
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton card for course/video cards
 */
export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <Skeleton height="200px" className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <Skeleton height="24px" width="80%" />
        <Skeleton height="16px" width="60%" className={styles.skeletonMargin} />
        <Skeleton height="16px" width="40%" />
      </div>
    </div>
  );
}

/**
 * Full page loading with optional text
 */
export function FullPageLoading({ text }: { text?: string }) {
  return <Loading fullPage text={text} size="large" />;
}







