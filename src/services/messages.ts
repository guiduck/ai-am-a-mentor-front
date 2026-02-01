import API from "@/lib/api";

export interface ConversationSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  participantId: string;
  participantName: string;
  lastMessageAt?: string | null;
  createdAt: string;
}

export interface ConversationDetails {
  id: string;
  courseId: string;
  courseTitle: string;
  creator: {
    id: string;
    username: string;
  };
  student: {
    id: string;
    username: string;
  };
  lastMessageAt?: string | null;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface CreatorContact {
  courseId: string;
  courseTitle: string;
  students: {
    id: string;
    name: string;
  }[];
}

export interface StudentContact {
  courseId: string;
  courseTitle: string;
  creatorId: string;
  creatorName: string;
}

export async function getMessageContacts(): Promise<
  CreatorContact[] | StudentContact[]
> {
  const response = await API<CreatorContact[] | StudentContact[]>(
    "messages/contacts"
  );

  if (response.error || !response.data) {
    console.error("Error loading contacts:", response.errorUserMessage);
    return [];
  }

  return response.data;
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const response = await API<{ conversations: ConversationSummary[] }>(
    "messages/conversations"
  );

  if (response.error || !response.data) {
    console.error("Error loading conversations:", response.errorUserMessage);
    return [];
  }

  return response.data.conversations;
}

export async function getConversation(
  conversationId: string
): Promise<ConversationDetails | null> {
  const response = await API<ConversationDetails>(
    `messages/conversations/${conversationId}`
  );

  if (response.error || !response.data) {
    console.error("Error loading conversation:", response.errorUserMessage);
    return null;
  }

  return response.data;
}

export async function getMessages(
  conversationId: string,
  since?: string | null
): Promise<MessageItem[]> {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const response = await API<{ messages: MessageItem[] }>(
    `messages/conversations/${conversationId}/messages${query}`
  );

  if (response.error || !response.data) {
    console.error("Error loading messages:", response.errorUserMessage);
    return [];
  }

  return response.data.messages;
}

export async function startConversation(data: {
  courseId: string;
  recipientId?: string;
  message: string;
}): Promise<{ conversationId: string; messageId: string } | { error: string }> {
  const response = await API<{ conversationId: string; messageId: string }>(
    "messages/conversations/start",
    {
      method: "POST",
      data,
    }
  );

  if (response.error || !response.data) {
    return { error: response.errorUserMessage || "Erro ao iniciar conversa" };
  }

  return response.data;
}

export async function sendMessage(
  conversationId: string,
  message: string
): Promise<{ messageId: string; createdAt: string } | { error: string }> {
  const response = await API<{ messageId: string; createdAt: string }>(
    `messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      data: { message },
    }
  );

  if (response.error || !response.data) {
    return { error: response.errorUserMessage || "Erro ao enviar mensagem" };
  }

  return response.data;
}

export async function markConversationRead(
  conversationId: string
): Promise<{ success: boolean; readCount: number } | null> {
  const response = await API<{ success: boolean; readCount: number }>(
    `messages/conversations/${conversationId}/read`,
    { method: "POST" }
  );

  if (response.error || !response.data) {
    console.error("Error marking conversation as read:", response.errorUserMessage);
    return null;
  }

  return response.data;
}
