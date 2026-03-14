"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/Button/Button";
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
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [startCourseId, setStartCourseId] = useState("");
  const [startRecipientId, setStartRecipientId] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const lastMessageAtRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const autoStartKeyRef = useRef<string | null>(null);

  const isCreator = user?.role === "creator";

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId
      ) || null,
    [conversations, selectedConversationId]
  );

  const conversationsByCourse = useMemo(() => {
    const grouped = new Map<
      string,
      { courseId: string; courseTitle: string; items: ConversationSummary[] }
    >();

    conversations.forEach((conversation) => {
      const existing = grouped.get(conversation.courseId);
      if (existing) {
        existing.items.push(conversation);
        return;
      }

      grouped.set(conversation.courseId, {
        courseId: conversation.courseId,
        courseTitle: conversation.courseTitle,
        items: [conversation],
      });
    });

    return Array.from(grouped.values());
  }, [conversations]);

  const selectedCourseContacts = useMemo(() => {
    if (!isCreator) {
      return [] as CreatorContact["students"];
    }

    const selected = creatorContacts.find(
      (contact) => contact.courseId === startCourseId
    );

    return selected?.students || [];
  }, [creatorContacts, isCreator, startCourseId]);

  const selectedStartCourse = useMemo(() => {
    if (!startCourseId) {
      return null;
    }

    return (isCreator ? creatorContacts : studentContacts).find(
      (contact) => contact.courseId === startCourseId
    );
  }, [creatorContacts, isCreator, startCourseId, studentContacts]);

  const selectedStartParticipant = useMemo(() => {
    if (!startCourseId) {
      return null;
    }

    if (isCreator) {
      return (
        selectedCourseContacts.find((student) => student.id === startRecipientId) ||
        null
      );
    }

    const contact = studentContacts.find(
      (item) => item.courseId === startCourseId
    );
    if (!contact) {
      return null;
    }

    return { id: contact.creatorId, name: contact.creatorName };
  }, [
    isCreator,
    selectedCourseContacts,
    startCourseId,
    startRecipientId,
    studentContacts,
  ]);

  const resolveAutoRecipientId = () => {
    if (!startCourseId) {
      return null;
    }

    if (isCreator) {
      return startRecipientId || null;
    }

    const contact = studentContacts.find(
      (item) => item.courseId === startCourseId
    );

    return contact?.creatorId || null;
  };

  const canCompose =
    !!selectedConversation || (!!startCourseId && !!resolveAutoRecipientId());

  const availableCourses = isCreator ? creatorContacts : studentContacts;

  const headerParticipantName =
    selectedConversation?.participantName || selectedStartParticipant?.name || "";

  const headerCourseTitle =
    selectedConversation?.courseTitle || selectedStartCourse?.courseTitle || "";

  const getInitials = (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) {
      return "?";
    }

    const parts = cleaned.split(" ").filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return `${first}${last}`.toUpperCase();
  };

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

  const loadMessages = async (
    conversationId: string,
    since?: string | null
  ) => {
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

  const handleAutoStartConversation = async (
    courseId: string,
    participantId: string
  ) => {
    const existing = conversations.find(
      (conversation) =>
        conversation.courseId === courseId &&
        conversation.participantId === participantId
    );

    if (existing) {
      if (existing.id !== selectedConversationId) {
        await handleSelectConversation(existing.id);
      }
      return;
    }

    if (isStarting) {
      return;
    }

    setIsStarting(true);
    setStartError(null);
    const result = await startConversation({
      courseId,
      recipientId: isCreator ? participantId : undefined,
      message: "",
    });
    setIsStarting(false);

    if ("error" in result) {
      autoStartKeyRef.current = null;
      setStartError(result.error);
      toast.error(result.error);
      return;
    }

    await loadConversations();
    await handleSelectConversation(result.conversationId);
  };

  const handleSendMessage = async () => {
    if (!messageDraft.trim()) {
      toast.error("Digite uma mensagem antes de enviar.");
      return;
    }

    if (!selectedConversationId) {
      if (!startCourseId) {
        toast.error("Selecione um curso para iniciar a conversa.");
        return;
      }

      const participantId = resolveAutoRecipientId();
      if (isCreator && !participantId) {
        toast.error("Selecione um aluno para iniciar a conversa.");
        return;
      }

      setIsSending(true);
      setStartError(null);
      const result = await startConversation({
        courseId: startCourseId,
        recipientId: isCreator ? participantId || undefined : undefined,
        message: messageDraft.trim(),
      });
      setIsSending(false);

      if ("error" in result) {
        setStartError(result.error);
        toast.error(result.error);
        return;
      }

      setMessageDraft("");
      await loadConversations();
      await handleSelectConversation(result.conversationId);
      return;
    }

    setIsSending(true);
    const result = await sendMessage(
      selectedConversationId,
      messageDraft.trim()
    );
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
    autoStartKeyRef.current = null;
  }, [startCourseId]);

  useEffect(() => {
    const participantId = resolveAutoRecipientId();
    if (!startCourseId || !participantId) {
      return;
    }

    const autoKey = `${startCourseId}:${participantId}`;
    if (autoStartKeyRef.current === autoKey) {
      return;
    }

    autoStartKeyRef.current = autoKey;
    void handleAutoStartConversation(startCourseId, participantId);
  }, [
    startCourseId,
    startRecipientId,
    isCreator,
    studentContacts,
    conversations,
  ]);

  useEffect(() => {
    if (availableCourses.length === 0 || startCourseId) {
      return;
    }

    setStartCourseId(availableCourses[0].courseId);
  }, [availableCourses, startCourseId]);

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
          <p>Converse com seus alunos ou criadores em uma interface contínua.</p>
        </div>

        <div className={styles.layout}>
          <aside className={styles.sidebarPanel}>
            <div className={styles.sidebarHeader}>
              <div>
                <h2>Conversas</h2>
                <p>Os cursos funcionam como grupos.</p>
              </div>
              <span className={styles.sidebarBadge}>{conversations.length}</span>
            </div>

            <div className={styles.startForm}>
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
                  {(isCreator ? creatorContacts : studentContacts).map(
                    (contact) => (
                      <option key={contact.courseId} value={contact.courseId}>
                        {contact.courseTitle}
                      </option>
                    )
                  )}
                </select>
              </div>

              {isCreator && startCourseId && (
                <div className={styles.formGroup}>
                  <Label htmlFor="student">Aluno</Label>
                  <select
                    id="student"
                    className={styles.select}
                    value={startRecipientId}
                    onChange={(event) =>
                      setStartRecipientId(event.target.value)
                    }
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

              {isStarting && (
                <span className={styles.startingInfo}>
                  Preparando conversa...
                </span>
              )}

              {startError && <p className={styles.inlineError}>{startError}</p>}
            </div>

            <div className={styles.conversationGroups}>
              {conversationsByCourse.length === 0 ? (
                <p className={styles.emptyState}>
                  Nenhuma conversa iniciada ainda.
                </p>
              ) : (
                conversationsByCourse.map((group) => (
                  <div
                    key={group.courseId}
                    className={styles.conversationGroup}
                  >
                    <span className={styles.groupTitle}>
                      {group.courseTitle}
                    </span>
                    <div className={styles.conversationList}>
                      {group.items.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          className={`${styles.conversationItem} ${
                            conversation.id === selectedConversationId
                              ? styles.conversationActive
                              : ""
                          }`}
                          onClick={() =>
                            handleSelectConversation(conversation.id)
                          }
                        >
                          <div className={styles.conversationAvatar}>
                            {getInitials(conversation.participantName)}
                          </div>
                          <div className={styles.conversationBody}>
                            <div className={styles.conversationHeader}>
                              <span className={styles.conversationName}>
                                {conversation.participantName}
                              </span>
                              {conversation.unreadCount &&
                                conversation.unreadCount > 0 && (
                                  <span className={styles.unreadBadge}>
                                    {conversation.unreadCount}
                                  </span>
                                )}
                            </div>
                            {conversation.lastMessageAt && (
                              <span className={styles.conversationDate}>
                                {new Date(
                                  conversation.lastMessageAt
                                ).toLocaleDateString("pt-BR")}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className={styles.chatPanel}>
            <div className={styles.chatHeader}>
              <div>
                <h3>
                  {headerParticipantName || "Selecione uma conversa"}
                </h3>
                {headerCourseTitle && (
                  <span className={styles.chatSubHeader}>{headerCourseTitle}</span>
                )}
              </div>
              {headerParticipantName && (
                <div className={styles.chatAvatar}>
                  {getInitials(headerParticipantName)}
                </div>
              )}
            </div>

            <div className={styles.chatBody}>
              {selectedConversation ? (
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
                            {new Date(message.createdAt).toLocaleTimeString(
                              "pt-BR",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className={styles.chatEmptyState}>
                  <div className={styles.chatEmptyIcon}>💬</div>
                  <strong>Escolha um curso e um aluno</strong>
                  <p>
                    A conversa aparece aqui e o campo de mensagem fica disponível
                    no rodapé.
                  </p>
                </div>
              )}
            </div>

            {canCompose && (
              <div className={styles.chatComposer}>
                <button type="button" className={styles.composerAction}>
                  +
                </button>
                <textarea
                  className={styles.textarea}
                  rows={2}
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
                  Enviar
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
