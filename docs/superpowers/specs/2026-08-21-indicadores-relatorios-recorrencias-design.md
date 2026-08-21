# Especificação — Indicadores, relatórios e recorrências por perfil

**Status:** aguardando revisão do solicitante  
**Data:** 21 de agosto de 2026

## Objetivo

Ampliar o AION para oferecer comparativos mensais interpretáveis, relatórios adequados a cada perfil e controle de compromissos financeiros recorrentes. A solução deve preservar a prioridade do produto: o cliente final entende sua situação financeira; o MEI visualiza uma DRE gerencial proporcional à operação; o consultor conduz a rotina operacional.

## Escopo funcional

| Área | Entrega |
|---|---|
| Jornada pessoal | Comparativo mensal de receitas, gastos, saldo, categoria com maior gasto, contas previstas e metas. |
| Jornada MEI | DRE gerencial mensal simplificada com receitas, custos e despesas, resultado líquido, margem líquida, fluxo do período, custos fixos e comparação mensal. |
| Movimentações | Ordenação explícita por data, crescente ou decrescente, preservando filtros de tipo, categoria e período. |
| Atualização | Inclusões e confirmações invalidam os dados de movimentações, painéis, relatórios e previsões do cliente afetado. |
| PDF pessoal | Relatório mensal de uma página com receitas, gastos por categoria, saldo, contas previstas, metas, maior categoria e comparação com o período anterior. |
| PDF MEI | DRE gerencial mensal em PDF, com escopo e linguagem adequados ao pequeno negócio. |
| Recorrências | Regras mensais ou anuais, com descrição, categoria, tipo, valor, dia de vencimento, status ativo ou suspenso e próxima competência. |

## Modelo de dados

Uma entidade de recorrência representa a regra de um compromisso recorrente, não um movimento financeiro efetivo. Ela conterá cliente, descrição, valor, tipo, categoria opcional, periodicidade (`mensal` ou `anual`), dia de vencimento, próxima competência, status e metadados de auditoria.

As previsões serão registros gerados a partir das regras, identificados de forma única por recorrência e competência. Cada previsão começará com status `previsto` e poderá ser confirmada, adiada ou cancelada. A confirmação criará ou vinculará uma transação efetiva. Suspender uma regra impede somente previsões futuras e preserva os registros históricos.

> A geração será idempotente: uma regra não poderá criar duas previsões para a mesma competência.

## Indicadores e cálculos

Os cálculos ocorrerão no servidor com base somente em transações efetivas do cliente. Previsões servem para contas a vencer, mas não entram como receita, despesa, saldo, margem ou resultado realizado.

| Perfil | Indicadores mensais |
|---|---|
| Cliente pessoal | Receitas, gastos, saldo, maior categoria, variação de gastos versus mês anterior, contas previstas e evolução de metas. |
| MEI/empreendedor | Receitas, custos fixos, despesas operacionais, resultado líquido, margem líquida, fluxo de caixa do período e comparação mensal. |

Quando não houver transações do mês anterior, a interface e o PDF informarão que não há histórico comparável. Não serão apresentados percentuais, tendências ou valores fictícios.

## Permissões e jornadas

| Perfil | Permissões |
|---|---|
| Cliente pessoal | Acessar seu resumo, contas previstas, metas, movimentações pessoais e PDF de resumo. Não acessa DRE, conciliação, exportação operacional ou controles BPO. |
| MEI/empreendedor | Acessar seu dashboard empresarial, DRE em PDF, contas previstas e dados do próprio negócio. |
| Consultor Aion | Criar, editar, suspender e confirmar recorrências; registrar lançamentos; gerir categorias; consultar e exportar dados de seus clientes. |

Os procedimentos no servidor verificarão o vínculo entre usuário, cliente e consultor. As proteções de rota da interface serão complementares e não substituirão essa autorização.

## Experiência de uso

O cliente pessoal terá uma visão mensal enxuta, orientada por perguntas práticas: quanto entrou, quanto saiu, qual categoria concentrou gasto, como o resultado mudou e quais compromissos se aproximam. O PDF repete esse resumo em linguagem acessível.

O empreendedor terá um bloco editorial de indicadores, inspirado apenas na hierarquia da referência fornecida: poucos cartões com estado claro e uma tendência mensal. A **Evolução do Mês** ficará no topo da área analítica, próxima ao histórico e aos indicadores do período, para que a leitura comece pela variação temporal antes do detalhamento complementar. Não haverá métricas de startup, como CAC, runway ou eficiência de vendas, que não sejam apropriadas à gestão de um MEI.

Na tela de movimentações, a ordenação será uma seleção explícita entre “mais recentes primeiro” e “mais antigas primeiro”. Toda criação, confirmação ou importação de lançamento atualizará a lista e os resumos sem exigir recarga manual.

## Contratos e erros

Os contratos incluirão criação, listagem, atualização de status, geração de previsões e confirmação de previsões. O sistema retornará erros claros para regra inexistente, data inválida, acesso não autorizado, previsão já confirmada e tentativa de duplicação da mesma competência.

As exportações PDF serão geradas no servidor e persistidas no armazenamento existente. O download respeitará autorização pelo perfil e pelo cliente. Falhas de geração não criarão histórico de relatório incompleto.

## Testes e validação

1. Testar geração idempotente de previsões mensal e anual.
2. Testar suspensão de regra e preservação do histórico já gerado.
3. Testar confirmação de previsão e criação de transação efetiva única.
4. Testar ordenação crescente e decrescente com filtros combinados.
5. Testar atualização de consultas após lançar, importar ou confirmar uma transação.
6. Testar cálculos de indicadores com mês anterior, sem mês anterior e sem lançamentos.
7. Testar permissões de PDFs e bloqueio das rotinas BPO ao perfil pessoal.
8. Executar suíte automatizada, verificação de tipos, build de produção e validação visual nos temas claro e escuro.

## Critérios de aceite

O cliente final visualiza e exporta seu resumo sem acessar operações internas. O MEI consulta e exporta uma DRE mensal simples e consistente com seus lançamentos. O consultor controla recorrências sem duplicar previsões. Os novos lançamentos aparecem imediatamente nas movimentações e nos indicadores, e os comparativos se baseiam exclusivamente em dados existentes.
