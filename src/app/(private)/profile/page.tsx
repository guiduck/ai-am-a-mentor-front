"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getCurrentUser, User } from "@/services/users";
import { updateProfile } from "@/actions/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/Button/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card/Card";
import { toast } from "sonner";
import { FullPageLoading } from "@/components/ui/Loading/Loading";
import styles from "./page.module.css";

const schema = z
  .object({
    username: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z
      .string()
      .optional()
      .refine(
        (val) => !val || val.length === 0 || val.length >= 6,
        "Senha deve ter pelo menos 6 caracteres"
      ),
    confirmPassword: z.string().optional(),
  })
  .refine((data) => {
    // If password is provided, confirmPassword must match
    if (data.password && data.password.length > 0) {
      return data.password === data.confirmPassword;
    }
    return true;
  }, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUserData(currentUser);
        reset({
          username: currentUser.username,
          email: currentUser.email,
          password: "",
          confirmPassword: "",
        });
        // Update store if needed
        if (!user || user.id !== currentUser.id) {
          setAuth(currentUser, "");
        }
      } else {
        toast.error("Erro ao carregar dados do usuário");
        router.push("/login");
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      toast.error("Erro ao carregar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Prepare update data (only include password if provided)
      const updateData: {
        username?: string;
        email?: string;
        password?: string;
      } = {
        username: data.username,
        email: data.email,
      };

      // Only include password if it was provided
      if (data.password && data.password.length > 0) {
        updateData.password = data.password;
      }

      const result = await updateProfile(updateData);

      if (result.error) {
        toast.error(result.errorUserMessage || "Erro ao atualizar perfil");
        return;
      }

      toast.success("Perfil atualizado com sucesso!");

      // Update local state
      if (result.data?.user) {
        setUserData(result.data.user);
        setAuth(result.data.user, "");
        // Reset form with new data (clear password fields)
        reset({
          username: result.data.user.username,
          email: result.data.user.email,
          password: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro ao atualizar perfil");
    }
  };

  if (loading) {
    return <FullPageLoading text="Carregando perfil..." />;
  }

  if (!userData) {
    return (
      <div className={styles.container}>
        <Card variant="elevated">
          <CardContent>
            <p>Erro ao carregar dados do usuário</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Meu Perfil</CardTitle>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
              margin: "var(--space-2) 0 0 0",
            }}
          >
            Atualize suas informações pessoais
          </p>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Label htmlFor="username">Nome de usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu nome de usuário"
                {...register("username")}
              />
              {errors.username && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--error)",
                  }}
                >
                  {errors.username.message}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--error)",
                  }}
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Label htmlFor="password">Nova senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Deixe em branco para não alterar"
                {...register("password")}
              />
              {errors.password && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--error)",
                  }}
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme a nova senha"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--error)",
                  }}
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginTop: "var(--space-2)",
              }}
            >
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                {isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: "var(--space-6)",
              paddingTop: "var(--space-6)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <h3
              style={{
                fontSize: "var(--text-base)",
                fontWeight: 600,
                marginBottom: "var(--space-3)",
              }}
            >
              Informações da conta
            </h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
              }}
            >
              <p>
                <strong>Papel:</strong>{" "}
                {userData.role === "creator" ? "Criador" : "Estudante"}
              </p>
              <p>
                <strong>Conta criada em:</strong>{" "}
                {new Date(userData.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <p>
                <strong>Última atualização:</strong>{" "}
                {new Date(userData.updatedAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

