"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useRouter } from "next/navigation";
import { registerAndLogin } from "@/actions/auth";

const schema = z.object({
  username: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["creator", "student"], {
    required_error: "Selecione o tipo de conta",
  }),
});

type FormData = z.infer<typeof schema>;

export default function FormRegister() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "student",
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: FormData) => {
    const res = await registerAndLogin(data);
    if (res?.error) {
      toast.error(res.errorUserMessage ?? "Erro no cadastro");
      return;
    }

    toast.success("Conta criada com sucesso! Bem-vindo!");
    // Redirect to the appropriate dashboard based on role
    const dashboardPath =
      data.role === "creator" ? "/dashboard/creator" : "/dashboard/student";
    router.push(dashboardPath);
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>Criar nova conta</CardTitle>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            margin: "var(--space-2) 0 0 0",
          }}
        >
          Preencha os dados para se cadastrar
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
              placeholder="Seu nome"
              {...register("username")}
            />
            {errors.username && (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-error)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                <span>⚠</span>
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
                  color: "var(--color-error)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                <span>⚠</span>
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
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-error)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                <span>⚠</span>
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
            <Label htmlFor="role">Tipo de conta</Label>
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginTop: "var(--space-1)",
              }}
            >
              <label
                style={{
                  flex: 1,
                  padding: "var(--space-4)",
                  border: `2px solid ${
                    selectedRole === "student"
                      ? "var(--color-primary)"
                      : "var(--border-primary)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  backgroundColor:
                    selectedRole === "student"
                      ? "var(--color-primary-alpha)"
                      : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  value="student"
                  {...register("role")}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "var(--text-base)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Estudante
                  </strong>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Aprenda com cursos e mentoria
                  </span>
                </div>
              </label>

              <label
                style={{
                  flex: 1,
                  padding: "var(--space-4)",
                  border: `2px solid ${
                    selectedRole === "creator"
                      ? "var(--color-primary)"
                      : "var(--border-primary)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  backgroundColor:
                    selectedRole === "creator"
                      ? "var(--color-primary-alpha)"
                      : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  value="creator"
                  {...register("role")}
                  style={{ display: "none" }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-1)",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "var(--text-base)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Criador
                  </strong>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Crie e venda cursos
                  </span>
                </div>
              </label>
            </div>
            {errors.role && (
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-error)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                }}
              >
                <span>⚠</span>
                {errors.role.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="large"
            fullWidth
            loading={isSubmitting}
          >
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
