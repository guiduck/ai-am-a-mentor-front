import API, { APIResponse } from "@/lib/api";

export async function loginUser(data: {
  email: string;
  password: string;
  role?: "creator" | "student";
}): Promise<APIResponse<{ token: string; access_token?: string }>> {
  // If role is provided, use the correct endpoint directly
  if (data.role) {
    const endpoint =
      data.role === "creator" ? "creators/login" : "students/login";
    return await API<{ token: string; access_token?: string }>(endpoint, {
      method: "POST",
      data: {
        email: data.email,
        password: data.password,
      },
    });
  }

  // Fallback: Try creator login first, then student (for backward compatibility)
  const creatorLoginRes = await API<{ token: string; access_token?: string }>(
    "creators/login",
    {
      method: "POST",
      data: {
        email: data.email,
        password: data.password,
      },
    }
  );

  // If creator login succeeds, return it
  if (!creatorLoginRes.error && creatorLoginRes.data?.token) {
    return creatorLoginRes;
  }

  // If creator login fails with 401 (not found), try student login
  if (creatorLoginRes.status === 401) {
    const studentLoginRes = await API<{ token: string; access_token?: string }>(
      "students/login",
      {
        method: "POST",
        data: {
          email: data.email,
          password: data.password,
        },
      }
    );
    return studentLoginRes;
  }

  // If creator login failed for other reasons, return that error
  return creatorLoginRes;
}
