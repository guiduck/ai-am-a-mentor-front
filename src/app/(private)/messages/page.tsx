"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import { Label } from "@/components/ui/label";
import {
  CreatorContact,
  MessageItem,
  StudentContact,
  getConversations,
  getMessageContacts,
  getMessages,
  markConversationRead,
  sendMessage,
  startConversation,
  type ConversationSummary,
} from "@/services/messages";
import styles from "./page.module.css";

const POLL_INTERVAL_MS = 12000;

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [creatorContacts, setCreatorContacts] = useState<CreatorContact[]>([]);
  const [studentContacts, setStudentContacts] = useState<StudentContact[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [startCourseId, setStartCourseId] = useState("");
  const [startRecipientId, setStartRecipientId] = useState("");
  const [startMessage, setStartMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const lastMessageAtRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isCreator = user?.role === "creator";

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ||
      null,
    [conversations, selectedConversationId]
  );

  const selectedCourseContacts = useMemo(() => {
    if (!isCreator) {
      return [] as CreatorContact["students"];
    }

    const selected = creatorContacts.find(
      (contact) => contact.courseId === startCourseId
    );

    return selected?.students || [];
  }, [creatorContacts, isCreator, startCourseId]);

  const loadConversations = async () => {
    const data = await getConversations();
    setConversations(data);
  };

  const loadContacts = async () => {
    const data = await getMessageContacts();

    if (isCreator) {
      setCreatorContacts(data as CreatorContact[]);
      setStudentContacts([]);
      return;
    }

    setStudentContacts(data as StudentContact[]);
    setCreatorContacts([]);
  };

  const loadMessages = async (conversationId: string, since?: string | null) => {
    const list = await getMessages(conversationId, since);

    if (since) {
      if (list.length > 0) {
        setMessages((prev) => [...prev, ...list]);
      }
    } else {
      setMessages(list);
    }

    const lastMessage = list[list.length - 1] || null;
    if (lastMessage?.createdAt) {
      lastMessageAtRef.current = lastMessage.createdAt;
    }

    await markConversationRead(conversationId);
  };

  const handleSelectConversation = async (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setIsLoadingMessages(true);
    setMessages([]);
    lastMessageAtRef.current = null;

    await loadMessages(conversationId);

    setIsLoadingMessages(false);
  };

  const handleStartConversation = async () => {
    if (!startCourseId) {
      toast.error("Selecione um curso para iniciar a conversa.");
      return;
    }

    if (isCreator && !startRecipientId) {
      toast.error("Selecione um aluno para iniciar a conversa.");
      return;
    }

    if (!startMessage.trim()) {
      toast.error("Digite uma mensagem para iniciar a conversa.");
      return;
    }

    setIsStarting(true);

    const result = await startConversation({
      courseId: startCourseId,
      recipientId: isCreator ? startRecipientId : undefined,
      message: startMessage.trim(),
    });

    setIsStarting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Conversa iniciada com sucesso!");
    setStartMessage("");
    await loadConversations();
    await handleSelectConversation(result.conversationId);
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId) {
      return;
    }

    if (!messageDraft.trim()) {
      toast.error("Digite uma mensagem antes de enviar.");
      return;
    }

    setIsSending(true);
    const result = await sendMessage(selectedConversationId, messageDraft.trim());
    setIsSending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: result.messageId,
        conversationId: selectedConversationId,
        senderId: user?.id || "",
        body: messageDraft.trim(),
        createdAt: result.createdAt,
      },
    ]);

    lastMessageAtRef.current = result.createdAt;
    setMessageDraft("");
    await markConversationRead(selectedConversationId);
    await loadConversations();
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadConversations(), loadContacts()]);
      setIsLoading(false);
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const interval = setInterval(async () => {
      await loadMessages(selectedConversationId, lastMessageAtRef.current);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedCourseContacts.length === 0) {
      setStartRecipientId("");
      return;
    }

    if (!startRecipientId) {
      setStartRecipientId(selectedCourseContacts[0].id);
    }
  }, [selectedCourseContacts, startRecipientId]);

  if (isLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <h1>Mensagens</h1>
          <p>Converse com seus alunos ou criadores</p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <Card variant="elevated" className={styles.startCard}>
              <CardHeader>
                <CardTitle>Iniciar conversa</CardTitle>
              </CardHeader>
              <CardContent className={styles.startContent}>
                <div className={styles.formGroup}>
                  <Label htmlFor="course">Curso</Label>
                  <select
                    id="course"
                    className={styles.select}
                    value={startCourseId}
                    onChange={(event) => {
                      setStartCourseId(event.target.value);
                      setStartRecipientId("");
                    }}
                  >
                    <option value="">Selecione</option>
                    {(isCreator ? creatorContacts : studentContacts).map((contact) => (
                      <option key={contact.courseId} value={contact.courseId}>
                        {contact.courseTitle}
                      </option>
                    ))}
                  </select>
                </div>

                {isCreator && startCourseId && (
                  <div className={styles.formGroup}>
                    <Label htmlFor="student">Aluno</Label>
                    <select
                      id="student"
                      className={styles.select}
                      value={startRecipientId}
                      onChange={(event) => setStartRecipientId(event.target.value)}
                    >
                      <option value="">Selecione</option>
                      {selectedCourseContacts.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!isCreator && startCourseId && (
                  <div className={styles.helperText}>
                    Você falará diretamente com o criador deste curso.
                  </div>
                )}

                <div className={styles.formGroup}>
                  <Label htmlFor="startMessage">Mensagem</Label>
                  <textarea
                    id="startMessage"
                    className={styles.textarea}
                    rows={3}
                    value={startMessage}
                    onChange={(event) => setStartMessage(event.target.value)}
                    placeholder="Escreva sua primeira mensagem"
                  />
                </div>

                <Button
                  variant="primary"
                  onClick={handleStartConversation}
                  loading={isStarting}
                  disabled={isStarting}
                >
                  Iniciar conversa
                </Button>
              </CardContent>
            </Card>

            <Card variant="elevated" className={styles.conversationsCard}>
              <CardHeader>
                <CardTitle>Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <p className={styles.emptyState}>
                    Nenhuma conversa iniciada ainda.
                  </p>
                ) : (
                  <div className={styles.conversationList}>
                    {conversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        type="button"
                        className={`${styles.conversationItem} ${
                          conversation.id === selectedConversationId
                            ? styles.conversationActive
                            : ""
                        }`}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        <span className={styles.conversationName}>
                          {conversation.participantName}
                        </span>
                        <span className={styles.conversationMeta}>
                          {conversation.courseTitle}
                        </span>
                        {conversation.lastMessageAt && (
                          <span className={styles.conversationDate}>
                            {new Date(conversation.lastMessageAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>

          <section className={styles.chatSection}>
            <Card variant="elevated" className={styles.chatCard}>
              <CardHeader>
                <CardTitle>
                  {selectedConversation
                    ? `${selectedConversation.participantName} · ${selectedConversation.courseTitle}`
                    : "Selecione uma conversa"}
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.chatContent}>
                {selectedConversation ? (
                  <>
                    <div className={styles.messageList}>
                      {isLoadingMessages ? (
                        <p className={styles.emptyState}>Carregando mensagens...</p>
                      ) : messages.length === 0 ? (
                        <p className={styles.emptyState}>
                          Nenhuma mensagem ainda. Envie a primeira!
                        </p>
                      ) : (
                        messages.map((message) => {
                          const isMine = message.senderId === user?.id;
                          return (
                            <div
                              key={message.id}
                              className={`${styles.messageBubble} ${
                                isMine ? styles.messageMine : styles.messageOther
                              }`}
                            >
                              <p>{message.body}</p>
                              <span className={styles.messageDate}>
                                {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.composer}>
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        value={messageDraft}
                        onChange={(event) => setMessageDraft(event.target.value)}
                        placeholder="Digite sua mensagem"
                      />
                      <Button
                        variant="primary"
                        onClick={handleSendMessage}
                        loading={isSending}
                        disabled={isSending}
                      >
                        Enviar mensagem
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    Selecione uma conversa ou inicie uma nova.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
