-- Esquema para o banco de dados do Supabase

-- Habilitar a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela para armazenar as freebets
CREATE TABLE IF NOT EXISTS freebets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  min_odds DECIMAL(10, 2) NOT NULL,
  expiry DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'extracted')),
  extracted_value DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar a performance das consultas por usuário
CREATE INDEX IF NOT EXISTS freebets_user_id_idx ON freebets(user_id);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_freebets_updated_at
BEFORE UPDATE ON freebets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE freebets ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias freebets
CREATE POLICY "Usuários podem ver apenas suas próprias freebets" 
ON freebets FOR SELECT 
USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram apenas suas próprias freebets
CREATE POLICY "Usuários podem inserir apenas suas próprias freebets" 
ON freebets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem apenas suas próprias freebets
CREATE POLICY "Usuários podem atualizar apenas suas próprias freebets" 
ON freebets FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para permitir que usuários excluam apenas suas próprias freebets
CREATE POLICY "Usuários podem excluir apenas suas próprias freebets" 
ON freebets FOR DELETE 
USING (auth.uid() = user_id);

-- Tabela para armazenar configurações do usuário
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  default_commission DECIMAL(5, 2) DEFAULT 2.0,
  auto_calculate BOOLEAN DEFAULT FALSE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar a performance das consultas por usuário
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias configurações
CREATE POLICY "Usuários podem ver apenas suas próprias configurações" 
ON user_settings FOR SELECT 
USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram apenas suas próprias configurações
CREATE POLICY "Usuários podem inserir apenas suas próprias configurações" 
ON user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem apenas suas próprias configurações
CREATE POLICY "Usuários podem atualizar apenas suas próprias configurações" 
ON user_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para permitir que usuários excluam apenas suas próprias configurações
CREATE POLICY "Usuários podem excluir apenas suas próprias configurações" 
ON user_settings FOR DELETE 
USING (auth.uid() = user_id);

-- Função para criar configurações padrão quando um usuário se cadastra
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para criar configurações padrão quando um usuário se cadastra
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
