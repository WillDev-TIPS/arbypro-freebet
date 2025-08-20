import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Configuração do Supabase | ArbyPro FreeBets",
  description: "Instruções para configurar o Supabase para o ArbyPro FreeBets",
}

export default function SetupPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-primary">Configuração do Supabase</h1>
          <p className="text-muted-foreground text-lg">
            Siga estas instruções para configurar o Supabase para o ArbyPro FreeBets
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Criar uma conta no Supabase</CardTitle>
            <CardDescription>
              Primeiro, você precisa criar uma conta gratuita no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Acesse <Link href="https://supabase.com" className="text-primary underline" target="_blank">https://supabase.com</Link> e clique em "Start your project" para criar uma conta gratuita.
            </p>
            <p>
              Você pode se cadastrar usando sua conta do GitHub ou Google.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Criar um novo projeto</CardTitle>
            <CardDescription>
              Após criar sua conta, crie um novo projeto no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              1. Clique em "New Project" no dashboard do Supabase
            </p>
            <p>
              2. Escolha uma organização (ou crie uma nova)
            </p>
            <p>
              3. Dê um nome ao seu projeto (ex: "arbypro-freebets")
            </p>
            <p>
              4. Escolha uma senha forte para o banco de dados (guarde-a com segurança)
            </p>
            <p>
              5. Escolha a região mais próxima de você
            </p>
            <p>
              6. Clique em "Create new project"
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Configurar o banco de dados</CardTitle>
            <CardDescription>
              Execute o script SQL para criar as tabelas e políticas de segurança
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              1. No dashboard do seu projeto, clique em "SQL Editor" no menu lateral
            </p>
            <p>
              2. Clique em "New query"
            </p>
            <p>
              3. Cole o conteúdo do arquivo <code className="bg-muted px-1 py-0.5 rounded">schema.sql</code> no editor
            </p>
            <p>
              4. Clique em "Run" para executar o script
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Obter as credenciais do projeto</CardTitle>
            <CardDescription>
              Você precisará da URL e da chave anônima do seu projeto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              1. No dashboard do seu projeto, clique em "Project Settings" no menu lateral
            </p>
            <p>
              2. Clique em "API" no submenu
            </p>
            <p>
              3. Copie a "URL" e a "anon public" key
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Configurar as variáveis de ambiente</CardTitle>
            <CardDescription>
              Crie um arquivo .env.local na raiz do projeto com suas credenciais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              1. Crie um arquivo chamado <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> na raiz do projeto
            </p>
            <p>
              2. Adicione as seguintes variáveis:
            </p>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
              <code>
                NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase{"\n"}
                NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
              </code>
            </pre>
            <p>
              3. Substitua <code className="bg-muted px-1 py-0.5 rounded">sua_url_do_supabase</code> e <code className="bg-muted px-1 py-0.5 rounded">sua_chave_anon_do_supabase</code> pelas credenciais que você copiou no passo anterior
            </p>
            <p>
              4. Reinicie o servidor de desenvolvimento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Configurar autenticação</CardTitle>
            <CardDescription>
              Configure o provedor de autenticação por email no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              1. No dashboard do seu projeto, clique em "Authentication" no menu lateral
            </p>
            <p>
              2. Clique em "Providers" no submenu
            </p>
            <p>
              3. Certifique-se de que o provedor "Email" está habilitado
            </p>
            <p>
              4. Se desejar, você pode desativar a confirmação de email para testes (não recomendado para produção)
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-6">
          <Link 
            href="/"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Voltar para o aplicativo
          </Link>
        </div>
      </div>
    </div>
  )
}
