import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "AI Am A Mentor - Cursos com Mentoria de IA",
  description:
    "Plataforma de cursos online com assistência de inteligência artificial personalizada para acelerar seu aprendizado.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
