# Solicitação de Conta com Aion — Moderação

**Status:** Aprovada para implementação  
**Data:** 22 de agosto de 2026  
**Contexto:** Aion Finance — acesso local de clientes

## Objetivo

Permitir que uma pessoa solicite uma conta Aion usando nome, e-mail e senha. O pedido não cria sessão, cliente ou dados financeiros imediatamente. Ele é direcionado ao Consultor Aion escolhido pelo solicitante e permanece na fila interna **Aion — Moderação** até uma decisão explícita.

## Escopo funcional

| Etapa | Comportamento aprovado |
|---|---|
| Solicitação pública | O formulário coleta nome, e-mail, senha, confirmação, jornada e Consultor Aion escolhido. |
| Jornada | O solicitante escolhe `Pessoal/Família` ou `MEI/Microempresa`; esta escolha define o tipo de cliente criado após aprovação. |
| Pendência | O pedido fica em status `pendente`; nenhum usuário, cliente, sessão ou lançamento financeiro é criado. |
| Moderação | Somente o Consultor Aion escolhido vê, aprova ou recusa a solicitação na fila Aion — Moderação. |
| Aprovação | Uma operação atômica cria o usuário local, o cliente vinculado ao consultor e o vínculo cliente–usuário. A senha já enviada é usada somente em forma de hash. |
| Recusa | A decisão fica no histórico; o mesmo e-mail pode enviar uma nova solicitação. |
| Duplicidade | Enquanto existir uma solicitação pendente para o e-mail, um novo pedido é bloqueado. |

## Modelo de dados

Será criada a tabela `account_access_requests` independente de `clients` e `users`.

| Campo | Tipo lógico | Regra |
|---|---|---|
| `id` | identificador | Chave primária. |
| `consultorId` | inteiro | Consultor escolhido pelo solicitante. |
| `name` | texto | Nome do solicitante. |
| `email` | texto | E-mail normalizado e usado para prevenir duplicidade pendente. |
| `passwordHash` | texto | Hash scrypt; a senha original não é persistida. |
| `businessType` | enum | `pessoal` ou `mei`. |
| `status` | enum | `pendente`, `aprovada` ou `recusada`. |
| `decidedAt` | data/hora | Momento de aprovação ou recusa. |
| `decidedBy` | inteiro | Usuário consultor responsável pela decisão. |
| `createdUserId` | inteiro | Usuário criado na aprovação, quando aplicável. |
| `createdClientId` | inteiro | Cliente criado na aprovação, quando aplicável. |
| `createdAt` / `updatedAt` | data/hora | Auditoria de criação e alteração. |

Será aplicado índice único composto para impedir mais de uma solicitação `pendente` por e-mail. A regra de novo pedido após uma recusa é preservada por atualização transacional do estado anterior antes da inserção do novo pedido.

## Interfaces e rotas

| Superfície | Alteração |
|---|---|
| `/acesso` | Adicionar a ação “Solicitar uma conta”. |
| `/solicitar-conta` | Página pública com formulário, seletor de consultor e confirmação de recebimento. |
| Cabeçalho do Consultor | Exibir alerta de solicitação pendente no sino existente. |
| Aion — Moderação | Painel consultivo com lista de pedidos destinados ao consultor autenticado e decisões de aprovar/recusar. |

## Contratos tRPC

| Procedimento | Acesso | Responsabilidade |
|---|---|---|
| `auth.availableConsultants` | Público | Lista somente consultores ativos elegíveis à seleção. |
| `auth.requestAccount` | Público | Valida dados, cria pedido pendente e nunca autentica o solicitante. |
| `moderation.listRequests` | Consultor | Retorna apenas solicitações destinadas ao consultor autenticado. |
| `moderation.decideRequest` | Consultor | Aprova ou recusa uma solicitação própria; a aprovação cria usuário e cliente em transação. |

## Segurança e regras de autorização

> Nenhuma senha em texto simples, token de sessão ou dado financeiro será persistido ou liberado no envio da solicitação.

O consultor precisa ser o destinatário do pedido para decidir sobre ele. A aprovação deverá falhar se o e-mail já pertencer a uma conta ativa ou se a solicitação não estiver mais pendente. O login local continuará respondendo com mensagem genérica para credenciais sem conta aprovada, evitando a enumeração de status de solicitação.

## Critérios de aceite e testes

1. Um pedido válido cria apenas uma solicitação pendente e mantém a senha em hash.
2. Um pedido duplicado pendente para o mesmo e-mail é recusado.
3. Consultores não destinatários não podem listar nem decidir o pedido.
4. Aprovar cria exatamente um usuário local e um cliente com a jornada escolhida, sem criar dados financeiros.
5. Recusar mantém o histórico e permite reenvio posterior.
6. O login falha antes da aprovação e funciona depois dela com a senha enviada.
7. A página pública, a fila Aion — Moderação e os estados de erro têm cobertura visual e automatizada.
