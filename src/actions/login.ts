"use server";

import { cookies } from "next/headers";
import { loginUser } from "@/services/auth/login";
import { APIResponse } from "@/lib/api";
import API from "@/lib/api";

interface User {
  id: string;
  username: string;
  email: string;
  role: "creator" | "student";
  createdAt: string;
  updatedAt: string;
}

export async function loginAndSetSession(
  email: string,
  password: string
): Promise<APIResponse<{ access_token: string }> | null> {
  console.log("[login] attempt", { email });
  const loginRes = await loginUser({ email, password });

  if (loginRes.error || !loginRes.data?.token) {
    console.warn("[login] failed", {
      status: loginRes.status,
      errorUserMessage: loginRes.errorUserMessage,
    });
    return {
      data: null,
      error: loginRes.error,
      errorUserMessage: loginRes.errorUserMessage,
      status: loginRes.status,
    };
  }

  const token = loginRes.data.token;
  const cookieStore = await cookies();
  console.log("[login] success, setting cookies");

  // Set the access token cookie first
  cookieStore.set("access_token", token, {
    httpOnly: false, // Allow JavaScript to read this cookie
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  // Now fetch user data using the token directly
  try {
    const userResponse = await API<User>("users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.error && userResponse.data) {
      const userData = userResponse.data;
      console.log("[login] fetched user info", {
        userId: userData.id,
        role: userData.role,
      });

      // Set user role and data cookies
      cookieStore.set("user_role", userData.role, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });

      cookieStore.set("user_data", JSON.stringify(userData), {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });

      return {
        ...loginRes,
        error: false,
        data: { access_token: token },
        errorUserMessage: "",
      };
    } else {
      console.error("[login] failed to fetch user data", userResponse);
      return {
        data: null,
        error: true,
        errorUserMessage: "Erro ao buscar dados do usuário",
        status: 500,
      };
    }
  } catch (error) {
    console.error("[login] Error fetching user data:", error);
    return {
      data: null,
      error: true,
      errorUserMessage: "Erro ao buscar dados do usuário",
      status: 500,
    };
  }
}
