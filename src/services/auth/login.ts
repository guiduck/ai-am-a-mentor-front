import API, { APIResponse } from "@/lib/api";

export async function loginUser(data: {
  email: string;
  password: string;
  role?: "creator" | "student";
}): Promise<APIResponse<{ token: string; access_token?: string }>> {
  console.log("[loginUser] starting login", {
    email: data.email,
    role: data.role,
  });

  // If role is provided, use the correct endpoint directly
  if (data.role) {
    const endpoint =
      data.role === "creator" ? "creators/login" : "students/login";
    console.log("[loginUser] using direct endpoint:", endpoint);
    const result = await API<{ token: string; access_token?: string }>(
      endpoint,
      {
        method: "POST",
        data: {
          email: data.email,
          password: data.password,
        },
        skipAuthRedirect: true, // Don't redirect on 401 during login
      }
    );
    console.log("[loginUser] direct result:", {
      status: result.status,
      error: result.error,
    });
    return result;
  }

  // Fallback: Try creator login first, then student (for backward compatibility)
  console.log("[loginUser] trying creators/login first");
  const creatorLoginRes = await API<{ token: string; access_token?: string }>(
    "creators/login",
    {
      method: "POST",
      data: {
        email: data.email,
        password: data.password,
      },
      skipAuthRedirect: true, // Don't redirect on 401 during login
    }
  );
  console.log("[loginUser] creators/login result:", {
    status: creatorLoginRes.status,
    error: creatorLoginRes.error,
    errorMsg: creatorLoginRes.errorUserMessage,
  });

  // If creator login succeeds, return it
  if (!creatorLoginRes.error && creatorLoginRes.data?.token) {
    console.log("[loginUser] creator login success");
    return creatorLoginRes;
  }

  // If creator login fails with 401 (not found), try student login
  if (creatorLoginRes.status === 401) {
    console.log("[loginUser] got 401, trying students/login");
    const studentLoginRes = await API<{ token: string; access_token?: string }>(
      "students/login",
      {
        method: "POST",
        data: {
          email: data.email,
          password: data.password,
        },
        skipAuthRedirect: true, // Don't redirect on 401 during login
      }
    );
    console.log("[loginUser] students/login result:", {
      status: studentLoginRes.status,
      error: studentLoginRes.error,
    });
    return studentLoginRes;
  }

  // If creator login failed for other reasons, return that error
  console.log("[loginUser] returning creator error (status was not 401)");
  return creatorLoginRes;
}
