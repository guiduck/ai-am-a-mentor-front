"use server";

import { cookies } from "next/headers";
import { updateUserProfile, UpdateUserProfileData } from "@/services/users";
import { APIResponse } from "@/lib/api";
import { User } from "@/services/users";

export async function updateProfile(
  data: UpdateUserProfileData
): Promise<APIResponse<{ user: User }>> {
  const result = await updateUserProfile(data);

  if (result.error) {
    return {
      status: 400,
      error: true,
      errorUserMessage: result.errorMessage || "Erro ao atualizar perfil",
      data: null,
    };
  }

  // Update user data cookie if user was updated
  if (result.user) {
    const cookieStore = await cookies();
    cookieStore.set("user_data", JSON.stringify(result.user), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
  }

  return {
    status: 200,
    error: false,
    errorUserMessage: "",
    data: { user: result.user! },
  };
}








