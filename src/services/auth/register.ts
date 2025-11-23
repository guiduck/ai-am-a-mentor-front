import API from "@/lib/api";

export async function registerUser(data: {
  email: string;
  password: string;
  username: string;
  role: "creator" | "student";
}) {
  const endpoint =
    data.role === "creator" ? "creators/register" : "students/register";
  return await API<{ message: string; user: any }>(endpoint, {
    method: "POST",
    data: {
      email: data.email,
      password: data.password,
      username: data.username,
    },
  });
}
