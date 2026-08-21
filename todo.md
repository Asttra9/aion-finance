# Aion Finance — Devbuild 6.0

## Concluído

- [x] Schema inicial de usuários, clientes e módulos financeiros.
- [x] Roles `consultor_aion` e `cliente` com base de autorização.
- [x] Dashboard, clientes, transações, contas, relatórios, MEI e conciliação.
- [x] Parser OFX inicial.
- [x] Checkpoints históricos: `c85a73dc`, `f773733c`, `7db60e4b`.
- [x] CRM, SalesOps e Pipeline removidos do escopo.

## Devbuild 6.0 — pendências reais

- [x] Integrar importação OFX ao backend, armazenamento e deduplicação por `ofxId`.
- [x] Persistir categoria e separação pessoal/empresarial nas transações.
- [x] Implementar reconciliação de transações pendentes.
- [x] Completar CRUD de contas a pagar e receber.
- [x] Persistir checklist e documentos do workflow MEI com inicialização segura.
- [x] Gerar PDF real de DRE e Fluxo de Caixa com layout consultivo.
- [x] Armazenar PDFs e OFX e disponibilizar download autorizado.
- [x] Implementar notificações internas de vencimento e cobrança.
- [ ] Avaliar lembretes recorrentes via Heartbeat; não usar timers em processo.
- [x] Criar testes de OFX e cálculos financeiros determinísticos.
- [x] Criar testes de relatórios, workflow, CRUD e permissões.
- [x] Criar testes de PDF, notificações e isolamento de permissões.
- [x] Corrigir e validar a rota raiz com query string.
- [x] Atualizar `ContasPagar.tsx` e `ContasReceber.tsx` com edição e exclusão reais.
- [x] Atualizar `MeiWorkflow.tsx` para persistir etapas e documentos.
- [x] Revisar rótulo exato `Consultor Aion` na interface.
- [x] Executar typecheck, build, testes e validação visual.
- [x] Documentar API e procedimentos.
- [x] Criar checkpoint final.

## Critérios de saída

- [x] Typecheck sem erros.
- [x] Testes automatizados passando.
- [x] Preview sem 404 em `/` e `/?from_webdev=1`.
- [x] Dados de clientes isolados por autorização.
- [x] PDFs e OFX vinculados individualmente ao cliente.
- [x] Nenhum placeholder apresentado como funcionalidade concluída.
- [x] Checkpoint final salvo.

## Histórico de alterações

- [x] Continuidade solicitada pelo usuário após checkpoint `7db60e4b`.
- [x] Skills de automação, atualizações periódicas, armazenamento e notificações consultadas.
- [ ] Implementação dos gaps em andamento.

## Escopo removido

- [x] CRM.
- [x] SalesOps.
- [x] Pipeline.

## Regra operacional

- [ ] Marcar itens como concluídos somente após evidência em código, teste ou validação visual.
- [ ] Não publicar automaticamente.
- [ ] Não criar dados financeiros fictícios apresentados como reais.

## Última atualização

- [ ] Devbuild 6.0 em execução.

## Fim

- [ ] Entrega final ao usuário.

## Nota de rastreabilidade

- [x] O backlog anterior foi consolidado nesta versão para remover duplicidades acidentais e manter somente itens funcionais verificáveis.

## Próximo passo

- [x] Implementar a camada de dados e routers da Fase 2.

## Controle

- [ ] Revisar este arquivo antes do checkpoint.

## Aion Finance

- [ ] Plataforma financeira consultiva para MEIs e profissionais liberais.

## Encerramento

- [ ] Finalizar Devbuild 6.0.
