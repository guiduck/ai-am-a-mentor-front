"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card/Card";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import styles from "./page.module.css";

export default function MessagesPage() {
  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1>Mensagens</h1>
          <p>Converse com seus alunos ou criadores</p>
        </div>

        <div className={styles.content}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>💬 Sistema de Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={styles.placeholder}>
                Sistema de mensagens em desenvolvimento...
              </p>
              <p className={styles.info}>
                Funcionalidades planejadas:
              </p>
              <ul className={styles.featuresList}>
                <li>Chat em tempo real entre criadores e alunos</li>
                <li>Lista de conversas (estilo WhatsApp/AliExpress)</li>
                <li>Notificações de novas mensagens</li>
                <li>Histórico de conversas</li>
                <li>Suporte a múltiplas conversas simultâneas</li>
              </ul>
              <div className={styles.techNote}>
                <strong>Nota técnica:</strong> Sistema será implementado com:
                <ul style={{ marginTop: "8px", paddingLeft: "20px" }}>
                  <li><strong>WebSockets</strong> (Socket.io) para comunicação em tempo real</li>
                  <li><strong>Redis</strong> para gerenciamento de sessões, cache de mensagens e filas</li>
                  <li><strong>PostgreSQL</strong> para armazenamento permanente do histórico</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

