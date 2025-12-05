import API from "@/lib/api";

export interface TranscribeResponse {
  message: string;
  transcript?: string;
  videoId: string;
  status?: "processing" | "completed" | "error";
}

export interface TranscriptResponse {
  transcript: string;
  videoId: string;
  createdAt?: string;
}

export interface ChatResponse {
  response: string;
  videoId: string;
  question: string;
}

/**
 * Transcribe a video using OpenAI Whisper
 * Returns immediately with status "processing", then polls for completion
 */
export async function transcribeVideo(
  videoId: string
): Promise<TranscribeResponse | null> {
  try {
    const response = await API<TranscribeResponse>("videos/transcribe", {
      method: "POST",
      data: { videoId },
    });

    // If we get 202, transcription is processing in background
    if (response.status === 202 && response.data?.status === "processing") {
      console.log("Transcription started, polling for completion...");
      
      // Wait a bit before starting to poll (give it time to start processing)
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds initial delay
      
      // Poll for transcript (check every 5 seconds, max 5 minutes = 60 attempts)
      const maxAttempts = 60;
      const pollInterval = 5000; // 5 seconds
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const transcriptResponse = await getVideoTranscript(videoId, true); // Silent mode - don't log 404s
          if (transcriptResponse?.transcript) {
            console.log(`✅ Transcript found after ${(attempt + 1) * 5} seconds`);
            return {
              message: "Video transcribed successfully",
              transcript: transcriptResponse.transcript,
              videoId,
            };
          }
          // 404 is expected while transcription is in progress, don't log as error
        } catch (error: any) {
          // Only log non-404 errors (server errors, CORS, etc.)
          if (error?.status !== 404) {
            console.warn(`Polling attempt ${attempt + 1} failed:`, error);
          }
          // Continue polling even if there's an error
        }
        
        // Log progress every 6 attempts (30 seconds)
        if (attempt > 0 && attempt % 6 === 0) {
          console.log(`Still processing transcription... (${(attempt + 1) * 5}s elapsed)`);
        }
        
        // Wait before next attempt
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
      
      // Timeout after max attempts
      throw new Error("Transcription is taking longer than expected. Please try again in a few minutes or refresh the page.");
    }

    if (response.error || !response.data) {
      console.error("Error transcribing video:", {
        error: response.error,
        errorMessage: response.errorUserMessage,
        status: response.status,
      });

      // Return error message if available
      if (response.errorUserMessage) {
        throw new Error(response.errorUserMessage);
      }

      return null;
    }

    return response.data;
  } catch (error: any) {
    console.error("Error transcribing video:", error);
    // Re-throw if it's a file size error
    if (error.message && error.message.includes("25MB")) {
      throw error;
    }
    throw error; // Re-throw to show error message to user
  }
}

/**
 * Get transcript for a video
 */
export async function getVideoTranscript(
  videoId: string,
  silent: boolean = false // If true, don't log 404 errors (expected during polling)
): Promise<TranscriptResponse | null> {
  try {
    const response = await API<TranscriptResponse>(
      `videos/${videoId}/transcript`,
      {
        method: "GET",
      }
    );

    if (response.error || !response.data) {
      // 404 is expected while transcription is in progress, only log if not silent
      if (!silent || response.status !== 404) {
        console.error("Error fetching transcript:", {
          error: response.error,
          errorMessage: response.errorUserMessage,
          status: response.status,
        });
      }
      return null;
    }

    return response.data;
  } catch (error: any) {
    // Only log if not a 404 or if not silent
    if (!silent || error?.status !== 404) {
      console.error("Error fetching transcript:", error);
    }
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
