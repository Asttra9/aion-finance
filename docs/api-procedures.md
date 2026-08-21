# Aion Finance — Documentação da API e Procedimentos (Devbuild 6.0)

Esta documentação descreve a arquitetura, os contratos de API tRPC, as regras de segurança e os procedimentos operacionais da plataforma **Aion Finance**.

---

## 1. Visão Geral da Arquitetura

A **Aion Finance** é uma aplicação web fullstack desenvolvida com:
- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui e tRPC Client.
- **Backend:** Express 4, tRPC 11, Drizzle ORM e MySQL.
- **Autenticação:** Manus OAuth com suporte a dois perfis de acesso distintos:
  1. `consultor_aion`: Acesso total à gestão de clientes, relatórios, conciliação e fluxos financeiros.
  2. `cliente`: Acesso restrito exclusivamente ao próprio dashboard, transações, relatórios e notificações.

---

## 2. Contratos de API (tRPC Routers)

Os endpoints estão organizados por domínios sob o roteador principal `appRouter`:

### 2.1 Autenticação (`auth`)
- `auth.me`: Retorna o usuário autenticado atual ou `null`.
- `auth.logout`: Encerra a sessão limpando o cookie de autenticação.

### 2.2 Clientes (`clients`) — Exclusivo Consultor Aion
- `clients.list`: Retorna a lista de clientes vinculados ao consultor.
- `clients.get`: Retorna o perfil de um cliente específico (respeitando isolamento de acesso).
- `clients.create`: Cadastra um novo cliente pessoal, MEI, profissional liberal ou PJ.
- `clients.update`: Atualiza dados cadastrais, receita estimada ou status do cliente.

### 2.3 Transações e Conciliação (`transactions`)
- `transactions.list`: Lista transações de um cliente.
- `transactions.categories`: Lista categorias financeiras.
- `transactions.createCategory`: Cria uma nova categoria de receita ou despesa.
- `transactions.create`: Registra uma nova transação financeira.
- `transactions.importOfx`: Importa um arquivo OFX bruto, realiza deduplicação por `ofxId`, armazena o extrato de forma segura e cria registros pendentes.
- `transactions.reconcile`: Altera o status da transação para conciliada, definindo categoria e separação pessoal/empresarial.
- `transactions.update` / `transactions.delete`: Gerencia o ciclo de vida das transações.

### 2.4 Contas a Pagar e Receber (`accountsPayable` / `accountsReceivable`)
- CRUD completo com suporte a status (`pendente`, `pago`, `vencido`, `cancelado`), datas de vencimento e valores monetários.

### 2.5 Jornada MEI (`meiWorkflow`)
- Este módulo é opcional: serve exclusivamente para o acompanhamento de abertura ou regularização de MEI conduzido pela Aion.
- `meiWorkflow.get`: Recupera ou inicializa o checklist padrão de 8 etapas e documentos necessários para a abertura ou regularização.
- `meiWorkflow.updateStatus`: Atualiza o progresso das etapas, status geral e observações.

### 2.6 Relatórios e Geração de PDF (`reports`)
- `reports.generate`: Consolida transações do mês, calcula indicadores financeiros (margem, ponto de equilíbrio, resultado) e gera um arquivo PDF consultivo real utilizando `pdfkit`, armazenando-o de forma segura.
- `reports.download`: Retorna a URL assinada e o caminho seguro do relatório para download autorizado.

### 2.7 Notificações e Alertas de Cobrança (`notifications`)
- `notifications.list`: Lista alertas do cliente.
- `notifications.markAsRead`: Marca um alerta como lido.
- `notifications.createReminder`: Registra lembretes de cobrança enviados pelo consultor.
- `notifications.generateDueAlerts`: Varre contas a vencer e vencidas para gerar notificações automáticas.

---

## 3. Procedimentos Operacionais

1. **Importação OFX:** O consultor acessa a aba de conciliação do cliente, envia o arquivo OFX do banco, e o sistema processa automaticamente a extração de lançamentos e a prevenção de duplicidades.
2. **Geração de Relatórios DRE/Fluxo de Caixa:** Na aba de relatórios, o consultor seleciona o mês e o tipo de relatório. O sistema compila os dados, gera o PDF consultivo com identidade visual corporativa e disponibiliza o download seguro.
3. **Isolamento de Dados:** Usuários com o perfil `cliente` que tentarem acessar dados de outro ID receberão um erro HTTP `FORBIDDEN` garantindo a privacidade das informações financeiras.

4. **Lembretes recorrentes:** Alertas podem ser gerados de forma segura pelo procedimento `notifications.generateDueAlerts` durante o uso operacional. Para execução diária autônoma em produção, a Aion deve configurar um job de Heartbeat após a publicação do projeto, com callback autenticado; timers locais em processo não são utilizados.

5. **Jornadas de produto:** O Cliente Pessoal visualiza gastos, entradas, contas e inadimplência. O Microempresário visualiza caixa, entradas, saídas, obrigações e recebimentos. O Consultor Aion acompanha a carteira sem misturar as duas experiências.
