import { useAuthStore } from "@/stores/authStore";
import API from "@/lib/api";

// Initialize user data by calling the API (cookies will be sent automatically)
export async function initializeAuthFromAPI() {
  try {
    console.log("[auth] initializeAuthFromAPI start");
    const response = await API<{
      id: string;
      username: string;
      email: string;
      role: "creator" | "student";
      createdAt: string;
      updatedAt: string;
    }>("users/me", {
      method: "GET",
    });

    if (!response.error && response.data) {
      console.log("[auth] user data loaded", {
        userId: response.data.id,
        role: response.data.role,
      });
      useAuthStore.getState().setAuth(response.data, "");
    } else {
      console.warn("[auth] failed to init user from API", {
        status: response.status,
        errorUserMessage: response.errorUserMessage,
      });
    }
  } catch (error) {
    console.error("[auth] Error initializing auth from API:", error);
  }
}
