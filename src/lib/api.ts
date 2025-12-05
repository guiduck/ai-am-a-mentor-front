type NextFetchRequestConfig = {
  revalidate?: number | false;
  tags?: string[];
};

export interface APIResponse<T> {
  data: T | null;
  error: boolean;
  errorUserMessage: string;
  debug?: any;
  status: number;
  headers?: Headers | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

/**
 * Get auth token from cookie or Zustand store
 */
function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  // Try cookie first
  const cookies = document.cookie.split(";");
  const accessTokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("access_token=")
  );

  if (accessTokenCookie) {
    const tokenValue = accessTokenCookie.split("=").slice(1).join("=").trim();
    return decodeURIComponent(tokenValue);
  }

  // Fallback to Zustand store
  try {
    const { useAuthStore } = require("@/stores/authStore");
    return useAuthStore.getState().token || null;
  } catch {
    return null;
  }
}

/**
 * Clear all auth data and redirect to login
 */
function handleAuthExpired(): void {
  if (typeof window === "undefined") return;

  // Clear cookies
  document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "user_data=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  // Clear Zustand store
  try {
    const { useAuthStore } = require("@/stores/authStore");
    useAuthStore.getState().clearAuth();
  } catch {
    // Store not available
  }

  // Redirect to login
  window.location.href = "/login";
}

/**
 * Build API URL from base URL and path
 */
function buildApiUrl(url: string): string {
  const baseUrl = BASE_URL.replace(/\/$/, "");

  if (url.startsWith("/")) return `${baseUrl}${url}`;
  if (url.startsWith("api/")) return `${baseUrl}/${url}`;
  if (baseUrl.endsWith("/api")) return `${baseUrl}/${url}`;
  return `${baseUrl}/api/${url}`;
}

/**
 * Main API function for making authenticated requests
 */
export default async function API<T = any>(
  url: string,
  options: {
    method?: "GET" | "POST" | "DELETE" | "PUT";
    headers?: Record<string, string>;
    data?: any;
    next?: NextFetchRequestConfig;
    skipAuthRedirect?: boolean; // Skip auto-redirect on 401
  } = {}
): Promise<APIResponse<T>> {
  const { method = "GET", headers = {}, data, next, skipAuthRedirect = false } = options;

  const fullUrl = buildApiUrl(url);
  const token = getAuthToken();
  const isFormData = data instanceof FormData;
  const hasBody = method !== "GET" && data;

  const requestHeaders: Record<string, string> = {
    ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  try {
    const response = await fetch(fullUrl, {
      method,
      next,
      credentials: "include",
      headers: requestHeaders,
      ...(hasBody ? { body: isFormData ? data : JSON.stringify(data) } : {}),
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401 && !skipAuthRedirect) {
      handleAuthExpired();
      return {
        status: 401,
        data: null,
        error: true,
        errorUserMessage: "Sessão expirada. Faça login novamente.",
        headers: null,
      };
    }

    const responseData = await response.json();

    if (!response.ok) {
      return {
        status: response.status,
        data: null,
        error: true,
        errorUserMessage: responseData?.message || responseData?.error || "Erro desconhecido.",
        debug: responseData,
      };
    }

    return {
      status: response.status,
      data: responseData,
      error: false,
      errorUserMessage: "",
      headers: response.headers,
    };
  } catch (error: any) {
    return {
      status: error.status ?? 500,
      data: null,
      error: true,
      errorUserMessage: "Erro de conexão com o servidor.",
      headers: null,
      debug: error,
    };
  }
}
