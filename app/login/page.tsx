import { AuthForm } from "@/components/auth-form"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Login | ArbyPro FreeBets",
  description: "Faça login para gerenciar suas freebets",
}

export default function LoginPage() {
  return <AuthForm />
}
