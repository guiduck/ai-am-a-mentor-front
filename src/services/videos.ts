import API from "@/lib/api";

export interface Video {
  id: string;
  courseId: string;
  title: string;
  r2Key: string;
  transcriptR2Key?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    description: string;
    creatorId: string;
  };
}

export interface UploadUrlResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
  filename: string;
  contentType: string;
  bucket: string;
}

export interface CreateVideoData {
  courseId: string;
  title: string;
  r2Key: string;
  duration?: number;
}

export interface UpdateVideoData {
  title?: string;
  duration?: number;
  r2Key?: string;
}

export interface Comment {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

// Create a new video/lesson
export async function createVideo(
  videoData: CreateVideoData
): Promise<Video | null> {
  try {
    const response = await API<{ message: string; video: Video }>("videos", {
      method: "POST",
      data: videoData,
    });

    if (response.error || !response.data) {
      throw new Error(response.errorUserMessage || "Erro ao criar vídeo");
    }

    return response.data.video;
  } catch (error) {
    console.error("Error creating video:", error);
    throw error;
  }
}

// Get videos for a specific course
export async function getCourseVideos(courseId: string): Promise<Video[]> {
  try {
    const response = await API<Video[]>(`courses/${courseId}/videos`, {
      method: "GET",
    });

    if (response.error || !response.data) {
      return [];
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching course videos:", error);
    return [];
  }
}

// Get a specific video by ID
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    const response = await API<Video>(`videos/${videoId}`, {
      method: "GET",
    });

    if (response.error || !response.data) {
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching video:", error);
    return null;
  }
}

// Update a video
export async function updateVideo(
  videoId: string,
  updateData: UpdateVideoData
): Promise<Video | null> {
  try {
    const response = await API<{ message: string; video: Video }>(
      `videos/${videoId}`,
      {
        method: "PUT",
        data: updateData,
      }
    );

    if (response.error || !response.data) {
      throw new Error(response.errorUserMessage || "Erro ao atualizar vídeo");
    }

    return response.data.video;
  } catch (error) {
    console.error("Error updating video:", error);
    throw error;
  }
}

// Delete a video
export async function deleteVideo(
  videoId: string
): Promise<{ message: string } | null> {
  try {
    const response = await API<{ message: string }>(`videos/${videoId}`, {
      method: "DELETE",
    });

    if (response.error || !response.data) {
      throw new Error(response.errorUserMessage || "Erro ao deletar vídeo");
    }

    return response.data;
  } catch (error) {
    console.error("Error deleting video:", error);
    throw error;
  }
}

// Generate upload URL for video upload to Cloudflare R2
export async function generateUploadUrl(
  filename: string,
  contentType: string
): Promise<UploadUrlResponse> {
  try {
    const response = await API<UploadUrlResponse>("videos/upload-url", {
      method: "POST",
      data: { filename, contentType },
    });

    if (response.error || !response.data) {
      throw new Error(
        response.errorUserMessage || "Erro ao gerar URL de upload"
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error generating upload URL:", error);
    throw error;
  }
}

// Get streaming URL for a video
// Uses proxy endpoint to avoid CORS issues with Cloudflare R2
export type VideoStreamResult =
  | {
      ok: true;
      streamUrl: string;
      video: { id: string; title: string; duration?: number };
    }
  | {
      ok: false;
      status: number;
      message: string;
      debug?: any;
    };

export async function getVideoStreamUrl(
  videoId: string
): Promise<VideoStreamResult> {
  try {
    // First get video metadata from /stream endpoint
    const response = await API<{
      streamUrl?: string;
      video?: { id: string; title: string; duration?: number };
      status?: "processing";
      message?: string;
      retryAfterSeconds?: number;
    }>(`videos/${videoId}/stream`, {
      method: "GET",
    });

    if (response.error || !response.data) {
      return {
        ok: false,
        status: response.status,
        message:
          response.errorUserMessage ||
          "Não foi possível carregar o vídeo no momento.",
        debug: response.debug,
      };
    }

    if (response.status === 202 || response.data.status === "processing") {
      return {
        ok: false,
        status: 202,
        message:
          response.data.message ||
          "O vídeo ainda está sendo processado. Tente novamente em instantes.",
        debug: response.data,
      };
    }

    // Use presigned URL directly from R2 (requires CORS configuration in Cloudflare R2)
    // This is simpler and more performant than proxying through our servers
    const streamUrl = response.data.streamUrl;
    const video = response.data.video;

    if (!streamUrl || !video) {
      return {
        ok: false,
        status: response.status,
        message:
          "O vídeo ainda não está disponível. Tente novamente em instantes.",
        debug: response.data,
      };
    }

    console.log(
      "Using direct R2 presigned URL for video streaming:",
      streamUrl.substring(0, 100) + "..."
    );

    // Return presigned URL directly with video metadata
    return {
      ok: true,
      streamUrl,
      video,
    };
  } catch (error) {
    console.error("Error getting stream URL:", error);
    return {
      ok: false,
      status: 500,
      message: "Erro ao carregar o vídeo. Tente novamente em instantes.",
      debug: error,
    };
  }
}

// Get video as blob URL (for authenticated streaming)
// This function fetches the video with authentication and creates a blob URL
// This is necessary because <video> elements don't send cookies automatically in cross-origin requests
export async function getVideoBlobUrl(videoId: string): Promise<string | null> {
  try {
    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
    const baseUrl = BASE_URL.replace(/\/$/, "");
    const proxyUrl = `${baseUrl}/api/videos/${videoId}/proxy`;

    // Get auth token from cookie or Zustand store
    const getAuthToken = (): string | null => {
      if (typeof document === "undefined") return null;

      // Try to get token from cookie first
      const cookies = document.cookie.split(";");
      const accessTokenCookie = cookies.find((cookie) =>
        cookie.trim().startsWith("access_token=")
      );

      if (accessTokenCookie) {
        const tokenValue = accessTokenCookie
          .split("=")
          .slice(1)
          .join("=")
          .trim();
        return decodeURIComponent(tokenValue);
      }

      // Fallback: try to get from Zustand store
      try {
        const { useAuthStore } = require("@/stores/authStore");
        const token = useAuthStore.getState().token;
        if (token) return token;
      } catch (e) {
        // Zustand store not available
      }

      return null;
    };

    const token = getAuthToken();

    if (!token) {
      console.error("No authentication token available for video streaming");
      return null;
    }

    console.log("Fetching video with authentication...");

    // Fetch video with authentication headers
    const videoResponse = await fetch(proxyUrl, {
      method: "GET",
      credentials: "include", // Include cookies
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!videoResponse.ok) {
      console.error("Failed to fetch video:", {
        status: videoResponse.status,
        statusText: videoResponse.statusText,
      });
      return null;
    }

    // Convert response to blob
    const blob = await videoResponse.blob();

    // Create blob URL
    const blobUrl = URL.createObjectURL(blob);

    console.log("Video blob URL created successfully");

    return blobUrl;
  } catch (error) {
    console.error("Error creating video blob URL:", error);
    return null;
  }
}

// Get comments for a video
export async function getVideoComments(videoId: string): Promise<Comment[]> {
  try {
    const response = await API<Comment[]>(`videos/${videoId}/comments`, {
      method: "GET",
    });

    if (response.error || !response.data) {
      throw new Error(
        response.errorUserMessage || "Erro ao buscar comentários"
      );
    }

    return response.data;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
}

// Create a comment on a video
export async function createComment(
  videoId: string,
  content: string
): Promise<Comment> {
  try {
    const response = await API<Comment>(`videos/${videoId}/comments`, {
      method: "POST",
      data: { content },
    });

    if (response.error || !response.data) {
      throw new Error(response.errorUserMessage || "Erro ao criar comentário");
    }

    return response.data;
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
}
