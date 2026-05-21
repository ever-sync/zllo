import { redirect } from "next/navigation";

export default function Home() {
  // O proxy manda quem não está autenticado para /login.
  redirect("/operacao");
}
