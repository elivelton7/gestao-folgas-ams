# 📘 Manual do Usuário — Gestão de Folgas, Banco de Horas e Férias (Time AMS)

Este manual descreve de forma prática como utilizar todos os módulos do sistema de **Gestão de Folgas, Banco de Horas e Programação de Férias do Time AMS**.

---

## 1. 🔐 Acesso ao Sistema e Perfis de Usuário

Na tela inicial de login, você pode selecionar o perfil desejado clicando diretamente no botão do perfil ou digitando o usuário, seguido da respectiva senha:

| Perfil | Usuário | Senha | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador** | `AMS-ADM` | `AMS2026AMS` | **Acesso Total:** Cadastra, edita e exclui folgas e férias; gerencia equipes e colaboradores; importa planilha de Banco de Horas do RH; unifica cadastros duplicados e configura relatórios por e-mail. |
| **Consulta (Leitura)** | `AMS-CLICK` | `ams@2026` | **Somente Leitura:** Visualiza o quadro de folgas, saldos de banco de horas e programação de férias; utiliza todos os filtros de período/equipe e exporta relatórios para Excel (`.csv`). |

> **Dica:** Sua sessão permanece salva no navegador até que você clique no botão **Sair** (ícone de saída no canto superior direito).

---

## 2. 🧭 Barra Superior (Navegação Principal)

No topo da tela, você encontra os controles globais do sistema:

1. **Seletor de Módulo (`Folgas` | `Férias`):** Alterna instantaneamente entre o **Quadro de Folgas & Banco de Horas** e a **Programação de Férias**.
2. **Ícone de Gestão (`👥` — *Apenas `AMS-ADM`*):** Abre a central de **Gestão de Equipes, Colaboradores e Banco de Horas** (edição de saldos, importação de planilha do RH e unificação de colaboradores).
3. **Ícone de Relatórios por E-mail (`✉️` — *Apenas `AMS-ADM`*):** Abre a configuração de disparos automáticos e envio imediato de relatórios por e-mail.
4. **Alternador de Tema (`🌙` / `☀️`):** Alterna entre o **Modo Claro** e o **Modo Escuro**.
5. **Indicador de Status (`●`):** Ponto verde indicando que o banco de dados na nuvem está conectado e sincronizado em tempo real.
6. **Perfil Conectado e Botão Sair:** Exibe se você está logado como `AMS-ADM` ou `AMS-CLICK` e permite encerrar a sessão.

---

## 3. 📅 Módulo de Folgas e Banco de Horas

### 3.1. Como Registrar uma Nova Folga (*Perfil `AMS-ADM`*)
No painel lateral esquerdo (**Registrar Folga**):
1. **Time:** Selecione a equipe para filtrar os colaboradores ou mantenha *"Todos os Times"*.
2. **Colaborador:** Escolha o colaborador na lista (ou clique em **`+ Novo Colaborador`** para cadastrar alguém rapidamente).
   - *Observação:* Ao selecionar o colaborador, o sistema exibe imediatamente o **Saldo Hoje** (descontando folgas já usufruídas após a data-base do RH) e o **Saldo Base RH**.
3. **Data da Folga:** Selecione o dia no calendário (disponível apenas para datas a partir de hoje).
   - **Alerta de Conflito:** Caso outro colaborador já tenha folga marcada para a mesma data, o sistema exibirá um alerta amarelo mostrando quem estará ausente e de qual equipe, permitindo que você decida se deseja prosseguir.
4. **Duração da Folga:**
   - **Dia Inteiro (`08:00`):** Opção padrão. Equivale a `08:00` horas de desconto no banco de horas quando a data da folga chegar.
   - **Parcial (Horas):** Utilize quando o colaborador for se ausentar apenas algumas horas (ex.: `02:00`, `04:00`). Você pode clicar nos botões rápidos (`1h`, `2h`, `3h`, `4h`, `6h`) ou digitar no formato `HH:MM`.
5. **Descrição / Motivo:** Informe uma justificativa curta (ex.: *"Compensação de Banco de Horas"*, *"Consulta Médica"*).
6. Clique em **Confirmar Agendamento**.

### 3.2. Consultando, Filtrando e Exportando o Quadro de Folgas
No painel principal à direita (**Quadro de Folgas**):
- **Abas `Próximas` e `Passadas`:**
  - **Próximas:** Exibe todas as folgas de **hoje em diante** (ordenadas da mais próxima para a mais distante).
  - **Passadas:** Exibe o histórico de folgas **anteriores a hoje** (ordenadas da mais recente para a mais antiga).
- **Filtros Rápidos:**
  - **Por Período:** `30 dias`, `90 dias`, `Ano Inteiro` (ano corrente completo) ou `Todas`.
  - **Por Equipe:** Filtre os registros de um time específico no seletor de equipes.
- **Coluna `Saldo Hoje`:** Mostra em tempo real o saldo atualizado de cada colaborador em `HH:MM` (verde quando positivo, vermelho quando negativo). Passando o mouse sobre o saldo, você vê a data do último fechamento do RH.
- **Exportar para Excel (`Excel`):** Gera e baixa imediatamente uma planilha `.csv` (compatível com Microsoft Excel) contendo todos os registros da aba e filtros selecionados, incluindo o saldo de horas atual.
- **Editar ou Excluir (*Apenas `AMS-ADM`*):**
  - Clique no ícone de **lápis (`✏️`)** na linha da folga para alterar data, colaborador, tipo (integral/parcial) ou motivo.
  - Clique no ícone de **lixeira (`🗑️`)** para remover uma folga (com confirmação de segurança).

---

## 4. 🏖️ Módulo de Programação de Férias

Para acessar, clique em **Férias** no seletor do topo da página.

### 4.1. Como Agendar Férias (*Perfil `AMS-ADM`*)
No painel lateral esquerdo (**Agendar Férias**):
1. **Time e Colaborador:** Selecione a equipe e o colaborador.
2. **Início das Férias:** Informe o primeiro dia de saída.
3. **Quantidade de Dias Corridos:** Digite a quantidade de dias ou clique nos atalhos rápidos (`5d`, `10d`, `15d`, `20d`, `30d`).
4. **Volta ao Trabalho (Cálculo Inteligente):**
   - O sistema calcula automaticamente a data de retorno somando os dias corridos.
   - Se o retorno cair em um **sábado ou domingo**, o sistema avança automaticamente para o **próximo dia útil (segunda-feira)** e exibe um aviso informando o ajuste.
   - Caso haja um feriado local na segunda-feira, você pode ajustar manualmente o campo **Volta ao Trabalho**.
5. **Alerta de Conflito de Período:** Se outro colaborador tiver férias que se sobreponham aos mesmos dias de ausência, um card de alerta amarelo exibirá os nomes, equipes e períodos coincidentes.
6. **Observação (Opcional):** Ex.: *"1º Período"*, *"Férias Coletivas"*.
7. Clique em **Confirmar Férias**.

### 4.2. Acompanhando as Férias (`Em Curso`, `Próximas` e `Passadas`)
No painel principal (**Programação de Férias**):
- **Em Curso:** Lista quem está de férias **neste exato momento** (`Início <= Hoje` e `Retorno > Hoje`).
- **Próximas:** Férias futuras que ainda vão começar.
- **Passadas:** Férias já concluídas (cujo dia de retorno é hoje ou anterior), respeitando os filtros `30 dias`, `90 dias`, `Ano Inteiro` ou `Todas`.
- **Botão `Excel`:** Exporta a programação de férias filtrada para planilha `.csv`.

---

## 5. ⚙️ Central de Gestão: Equipes, Colaboradores e Banco de Horas (*Apenas `AMS-ADM`*)

Clique no ícone de **Gestão (`👥`)** na barra superior para abrir o painel administrativo com **4 abas**:

### Aba 1: Saldos & Colaboradores
Lista todos os colaboradores com busca rápida por nome ou equipe.
- **Como funciona o cálculo automático do `Saldo Hoje`?**
  $$\text{Saldo Hoje} = \text{Saldo Base RH} - \text{Folgas gozadas após a Data-Base até Hoje}$$
  - **Regra importante:** Folgas anteriores ou iguais à **Data-Base do RH** **não** são descontadas novamente (pois já estão contabilizadas no fechamento do RH). Folgas futuras (agendadas para depois de hoje) só passam a descontar quando o dia da folga chega. Cada folga de Dia Inteiro desconta `08:00`.
- **Edição Rápida na Linha:** Altere a **Equipe**, o **Saldo Base RH** (ex.: `+14:30` ou `-02:15`) ou a **Data-Base RH** diretamente na tabela e clique no botão **Salvar (`💾`)** da linha.
- **Novo Colaborador:** No topo da aba, preencha Nome, Equipe, Saldo Inicial e Data-Base e clique em **Adicionar**.
- **Excluir Colaborador (`🗑️`):** Remove o colaborador caso tenha sido cadastrado por engano. Se ele possuir folgas ou férias vinculadas, o sistema avisará antes e recomendará usar a aba **Unificar Duplicados**.

### Aba 2: Importar Planilha RH (`.xlsx` / `.csv`)
Permite atualizar o banco de horas de toda a equipe de uma só vez a partir do relatório do RH:
1. **Padrão da Planilha:**
   - **Coluna A:** Nome do Colaborador
   - **Coluna B:** Saldo de Horas no formato `HH:MM` ou `HHH:MM` (aceita valores positivos ou negativos, ex.: `18:45`, `-03:20`, `112:00`).
2. **Passo 1 — Informe a Data-Base do Fechamento do RH:** Campo obrigatório que define até qual data o RH contabilizou as horas da planilha.
3. **Passo 2 — Selecione o Arquivo (`.xlsx`, `.xls` ou `.csv`):**
   - O sistema analisa os nomes automaticamente (ignorando acentos e maiúsculas/minúsculas).
   - **Colaboradores já cadastrados:** São vinculados automaticamente (`Vinculado`).
   - **Colaboradores novos na planilha:** Ficam marcados como **`✨ Criar novo colaborador`** (você pode escolher a equipe na própria linha) — ou, se a pessoa já existir no sistema com um nome abreviado/diferente, basta selecioná-la na lista suspensa da linha! Ao fazer isso, o sistema **atualiza o nome do colaborador para o nome oficial da planilha do RH** e atualiza seu saldo sem gerar duplicidade.
4. **Passo 3 — Aplicar Saldos:** Clique em **Aplicar Saldos** para salvar todas as atualizações e novos cadastros de uma só vez.

### Aba 3: Unificar Duplicados (Merge)
Ideal para corrigir casos em que um mesmo colaborador acabou ficando com dois cadastros (por exemplo, um cadastrado manualmente com nome curto e outro criado na importação da planilha com o nome completo):
1. **Cadastro que será REMOVIDO (Origem):** Selecione o registro duplicado que deseja eliminar.
2. **Cadastro Principal que será MANTIDO (Destino):** Selecione o registro oficial que permanecerá no sistema.
3. **Opções Inteligentes:**
   - Você pode manter o nome do cadastro principal ou adotar o nome completo do registro de origem.
   - Se o destino estiver *"Sem Equipe"*, ele herda automaticamente a equipe do registro antigo.
   - Você escolhe qual **Saldo Base RH** deseja preservar.
4. Clique em **Unificar Cadastros Agora**: Todas as folgas e férias do registro antigo são transferidas para o colaborador principal sem perder nenhum histórico, e a duplicata é removida.

### Aba 4: Equipes
- Cadastre novas equipes digitando o nome (ex.: `SAP`, `Stellantis`, `Manufatura`) e clicando em **Criar Equipe**.
- Visualize quantos colaboradores estão vinculados a cada time.

---

## 6. ✉️ Relatórios Automatizados por E-mail (*Apenas `AMS-ADM`*)

Clique no ícone de **E-mail (`✉️`)** na barra superior para gerenciar o envio de resumos de folgas:

1. **Adicionar Destinatário:**
   - Informe o **Nome**, **E-mail** e a **Frequência de Envio**:
     - **Diário (08:00):** Envia todos os dias às 08h da manhã (horário de Brasília).
     - **Semanal (Seg 08:00):** Envia todas as segundas-feiras às 08h.
     - **Tempo Real (Imediato):** Dispara um e-mail automaticamente sempre que uma nova folga é cadastrada.
2. **Ativar / Pausar / Excluir:** Você pode pausar temporariamente o envio para um gestor clicando no status **Ativo/Pausado** ou remover o destinatário.
3. **Prévia e Disparo Manual:**
   - Clique em **Ver Prévia do E-mail** para inspecionar o conteúdo que será enviado.
   - Clique no ícone de **Avião de Papel (`✈️`)** ao lado de um destinatário para enviar um relatório avulso naquele instante, ou em **Disparar p/ Todos Ativos** para enviar imediatamente a toda a lista ativa.
