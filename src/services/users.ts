import API from "@/lib/api";

export interface UserApi {
  id: string;
  username: string;
  email: string;
  role: "creator" | "student";
  emailNotificationsEnabled: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "creator" | "student";
  emailNotificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Normaliza o usuário para consumo no frontend.
 */
function mapUser(user: UserApi): User {
  return {
    ...user,
    emailNotificationsEnabled: user.emailNotificationsEnabled === 1,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const response = await API<UserApi>(`users/${userId}`, {
      method: "GET",
    });

    if (response.error || !response.data) {
      return null;
    }

    return mapUser(response.data);
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await API<UserApi>("users/me", {
      method: "GET",
    });

    if (response.error || !response.data) {
      return null;
    }

    return mapUser(response.data);
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export interface UpdateUserProfileData {
  username?: string;
  email?: string;
  password?: string;
  emailNotificationsEnabled?: boolean;
}

export async function updateUserProfile(
  data: UpdateUserProfileData
): Promise<{ user: User | null; error: boolean; errorMessage?: string }> {
  try {
    const response = await API<{ message: string; user: UserApi }>("users/me", {
      method: "PUT",
      data,
    });

    if (response.error || !response.data) {
      return {
        user: null,
        error: true,
        errorMessage: response.errorUserMessage || "Erro ao atualizar perfil",
      };
    }

    return {
      user: mapUser(response.data.user),
      error: false,
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return {
      user: null,
      error: true,
      errorMessage: "Erro ao atualizar perfil",
    };
  }
}
