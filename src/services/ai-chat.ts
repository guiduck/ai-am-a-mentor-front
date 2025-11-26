import API from "@/lib/api";

export interface TranscribeResponse {
  message: string;
  transcript: string;
  videoId: string;
}

export interface TranscriptResponse {
  transcript: string;
  videoId: string;
  createdAt: string;
}

export interface ChatResponse {
  response: string;
  videoId: string;
  question: string;
}

/**
 * Transcribe a video using OpenAI Whisper
 */
export async function transcribeVideo(
  videoId: string
): Promise<TranscribeResponse | null> {
  try {
    const response = await API<TranscribeResponse>("videos/transcribe", {
      method: "POST",
      data: { videoId },
    });

    if (response.error || !response.data) {
      console.error("Error transcribing video:", {
        error: response.error,
        errorMessage: response.errorUserMessage,
        status: response.status,
      });
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error transcribing video:", error);
    return null;
  }
}

/**
 * Get transcript for a video
 */
export async function getVideoTranscript(
  videoId: string
): Promise<TranscriptResponse | null> {
  try {
    const response = await API<TranscriptResponse>(
      `videos/${videoId}/transcript`,
      {
        method: "GET",
      }
    );

    if (response.error || !response.data) {
      console.error("Error fetching transcript:", {
        error: response.error,
        errorMessage: response.errorUserMessage,
        status: response.status,
      });
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching transcript:", error);
    return null;
  }
}

/**
 * Ask a question to the AI mentor about a video
 */
export async function askAIMentor(
  videoId: string,
  question: string
): Promise<ChatResponse | null> {
  try {
    const response = await API<ChatResponse>("videos/chat", {
      method: "POST",
      data: { videoId, question },
    });

    if (response.error || !response.data) {
      console.error("Error asking AI mentor:", {
        error: response.error,
        errorMessage: response.errorUserMessage,
        status: response.status,
      });
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error asking AI mentor:", error);
    return null;
  }
}

