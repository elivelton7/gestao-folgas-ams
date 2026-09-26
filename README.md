# 📅 Gestão de Folgas - TI

Aplicação SPA moderna desenvolvida com **React**, **Vite**, **TypeScript**, **Tailwind CSS** e **Supabase** para gerenciamento de folgas de equipes de TI, com suporte a múltiplos times (como **Stellantis**, **Iveco** e outros).

---

## 🚀 Novidades Recentes

- 🏷️ **Título simplificado:** "Gestão de Folgas".
- 🏢 **Multi-Times:** Relacionamento entre Colaboradores e Times (Stellantis, Iveco, etc.).
- 🔍 **Filtro por Time:** Quadro de folgas com filtro para "Todos os Times" ou times específicos com badges coloridos.
- 🌓 **Tema Escuro (Dark Mode):** Alternador no topo para alternar instantaneamente entre temas claro e escuro.

---

## 🛠️ Configuração do Banco de Dados (Supabase)

Execute o script [`supabase-schema.sql`](./supabase-schema.sql) no **SQL Editor do Supabase**. 

Ele cria:
1. Tabela `teams` (com Stellantis e Iveco iniciais).
2. Tabela `employees` (com vínculo `team_id` referenciando `teams`).
3. Tabela `time_offs` (com integridade relacional e índices de performance).
4. Políticas de Row Level Security (RLS) para permitir uso na SPA.

> **Nota para quem já rodou o script antes:** O script inclui `ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS team_id UUID...` garantindo retrocompatibilidade sem perda de dados!

---

## ⚙️ Variáveis de Ambiente (.env)

Preencha o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## ▶️ Como Rodar Localmente

```bash
npm run dev
```

Acesse o endereço exibido no terminal (`http://localhost:5173`).
