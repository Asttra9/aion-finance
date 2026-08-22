# Plano de Implementação — Aion — Moderação

**Especificação de origem:** `docs/superpowers/specs/2026-08-22-solicitacao-de-conta-aion-moderacao.md`  
**Objetivo:** Implementar a solicitação pública de conta, a decisão restrita ao consultor escolhido e a criação segura de usuário/cliente após aprovação.

## Sequência crítica

| Ordem | Entrega | Dependência | Critério de conclusão |
|---|---|---|---|
| 1 | Modelo e migração | Nenhuma | Tabela de solicitações criada e índice de pendência aplicado. |
| 2 | Persistência e contratos | 1 | Procedures públicas e protegidas validam regras de negócio. |
| 3 | Interface pública | 2 | Solicitante envia pedido sem ganhar sessão ou criar cliente. |
| 4 | Aion — Moderação | 2 | Consultor destinatário lista e decide apenas seus pedidos. |
| 5 | Alertas e rotas | 3 e 4 | Acesso à solicitação e à moderação está conectado às jornadas corretas. |
| 6 | Testes e validação | 1 a 5 | Testes, typecheck, build e revisão visual aprovados. |

## Etapas de implementação

### 1. Persistência e migração

- [ ] Adicionar `accountAccessRequests` em `drizzle/schema.ts` com status, jornada, destinatário, hash de senha, decisão e vínculos de criação.
- [ ] Criar índice que previna solicitações pendentes duplicadas para o mesmo e-mail.
- [ ] Gerar a migração Drizzle, revisar o SQL e aplicá-lo de forma não destrutiva.
- [ ] Criar helpers em `server/db.ts` para listar consultores elegíveis, criar pedido, consultar pedidos do consultor e decidir de forma transacional.

### 2. Contratos e autorização

- [ ] Adicionar `auth.availableConsultants` e `auth.requestAccount` como procedures públicas com validação de e-mail, senha, jornada e consultor.
- [ ] Adicionar router `moderation` protegido por `consultorProcedure` com `listRequests` e `decideRequest`.
- [ ] Validar que o consultor só decida pedidos recebidos por ele e que pedidos já decididos não sejam processados novamente.
- [ ] Na aprovação, criar usuário local, cliente correspondente e vínculo entre ambos em operação transacional, sem lançamentos financeiros.

### 3. Solicitação pública de conta

- [ ] Criar `client/src/pages/SolicitarConta.tsx` seguindo a identidade Aion e os estados de carregamento, erro e confirmação.
- [ ] Coletar nome, e-mail, senha, confirmação, jornada e consultor; aplicar os requisitos de senha existentes.
- [ ] Registrar `/solicitar-conta` em `client/src/App.tsx` nos contextos público e autenticado, evitando 404.
- [ ] Adicionar ação “Solicitar uma conta” na tela `/acesso`.

### 4. Aion — Moderação e alertas

- [ ] Criar tela ou painel consultivo Aion — Moderação com status, jornada, solicitante, data e ações explícitas.
- [ ] Integrar o contador e o atalho da fila ao sino do consultor, sem criar uma duplicidade de alertas na navegação.
- [ ] Garantir que a fila não apareça para clientes e não exponha solicitações de outro consultor.

### 5. Cobertura e validação

- [ ] Criar ou ampliar testes de hash, duplicidade pendente, isolamento por consultor, aprovação, recusa, reenvio e login anterior/posterior à decisão.
- [ ] Criar testes de rotas e interfaces para a ação pública e a Aion — Moderação.
- [ ] Executar `pnpm test`, `pnpm check` e `pnpm build`.
- [ ] Validar visualmente os estados público, pendente, aprovação, recusa e fila consultiva com perfis existentes ou dados mínimos de solicitação sem dados financeiros fictícios.
- [ ] Atualizar `todo.md`, salvar checkpoint e registrar a entrega.

## Riscos e controles

| Risco | Controle de implementação |
|---|---|
| Duplicidade de e-mail | Checagem transacional de pedido pendente e de usuário ativo. |
| Aprovação concorrente | Atualização condicional do status `pendente` na mesma transação de criação. |
| Exposição entre consultores | Filtro obrigatório por `consultorId` em listagem e decisão. |
| Senha exposta | Hash scrypt antes da persistência; nenhuma senha original em log, resposta ou banco. |
| Criação parcial | Criação de usuário e cliente encapsulada em transação com rollback em falha. |
| Confusão com convite | Convites continuam para clientes já cadastrados; Aion — Moderação atende somente novas solicitações públicas. |
