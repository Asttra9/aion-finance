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
- [x] Avaliar lembretes recorrentes via Heartbeat; execução diária ficará condicionada à publicação e à configuração posterior de callback autenticado, sem timers em processo.
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
- [x] Redesign de UX, dashboards e Jornada MEI concluídos e validados; agendamento diário por Heartbeat permanece como configuração pós-publicação documentada.

## Escopo removido

- [x] CRM.
- [x] SalesOps.
- [x] Pipeline.

## Regra operacional

- [x] Backlog deste ciclo revisado: cada item funcional concluído possui evidência em código, teste, build ou preview.
- [x] Não publicar automaticamente.
- [x] Auditoria estática das superfícies de produto não encontrou dados fictícios ou placeholders funcionais apresentados como reais.

## Última atualização

- [x] Devbuild 6.0 e redesign de UX concluídos; job diário de Heartbeat é uma etapa explícita de operação pós-publicação.

## Fim

- [x] Checkpoint final do redesign preparado para entrega ao usuário.

## Nota de rastreabilidade

- [x] O backlog anterior foi consolidado nesta versão para remover duplicidades acidentais e manter somente itens funcionais verificáveis.

## Próximo passo

- [x] Implementar a camada de dados e routers da Fase 2.

## Controle

- [x] Revisar este arquivo antes do checkpoint.

## Aion Finance

- [x] Plataforma financeira consultiva para clientes pessoais, MEIs, profissionais liberais e pequenos negócios.

## Encerramento

- [x] Finalizar Devbuild 6.0 e o redesign de jornadas desta entrega.

## Redesign Aion — Identidade, UX e jornadas segmentadas

- [x] Aplicar paleta institucional Aion: vermelho profundo, grafite, branco e tons neutros de apoio.
- [x] Incorporar o símbolo oficial da Aion no layout sem armazenar assets dentro do projeto.
- [x] Redesenhar a navegação, hierarquia visual, estados vazios e responsividade do aplicativo.
- [x] Separar as jornadas de Cliente Pessoal, Microempresário e Consultor Aion.
- [x] Criar dashboard do Cliente Pessoal com entradas, gastos por categoria, contas pagas, contas a pagar e inadimplência.
- [x] Criar dashboard do Microempresário com fluxo de caixa, entradas, saídas, contas e obrigações como DAS.
- [x] Melhorar o Dashboard de Saúde Financeira com gráficos financeiros e insights acionáveis.
- [x] Reposicionar MEI Workflow como jornada opcional de abertura e regularização de MEI.
- [x] Remover MEI Workflow da navegação principal de perfis que não estejam em abertura ou regularização.
- [x] Atualizar testes, typecheck, build e validação visual do redesign.
- [x] Criar checkpoint do redesign após validação (`fbdd7d23`).

## Evolução de acesso, metas e indicadores

- [x] Criar tela de acesso Aion com jornada empresarial como padrão e alternância para Pessoal/Família.
- [x] Preservar autenticação OAuth e encaminhar a jornada selecionada após o acesso.
- [x] Criar modelo de dados e procedures para metas financeiras vinculadas ao cliente.
- [x] Criar interface de metas em caixinhas para os perfis pessoal e empresarial.
- [x] Criar resumo pós-login por categorias financeiras, com cartões clicáveis e detalhamento.
- [x] Criar aba de indicadores para Microempresário, destacando o maior gasto e uma orientação prática.
- [x] Transformar alertas em botão circular de sino ao lado do usuário no cabeçalho.
- [x] Alinhar o cabeçalho e a identificação da conta ao padrão visual enviado.
- [x] Criar testes, typecheck, build e validação visual das novas jornadas.
- [x] Salvar checkpoint da evolução de acesso, metas e indicadores (`0105135c`).

## Correções de navegação e evolução de metas

- [x] Registrar a rota `/clientes` e validar o acesso do Consultor Aion.
- [x] Redirecionar a rota raiz autenticada para a jornada financeira do cliente, sem forçar a visão do consultor.
- [x] Persistir histórico de aportes com data, valor e meta associada.
- [x] Exibir menu suspenso no sino com alertas e aportes mensais detalhados.
- [x] Adicionar uma entrada visível para Metas na navegação de clientes pessoal e empresarial.
- [x] Criar tela dedicada de Metas com caixinhas, aportes e histórico por mês.
- [x] Criar testes, typecheck, build e validação visual das correções.
- [x] Salvar checkpoint das correções de navegação e metas (`c9524875`).

## Robustez operacional — análise técnica recebida

- [x] Remover a entrada lateral duplicada de Alertas e manter o sino flutuante como único acesso aos alertas.
- [x] Eliminar consultas N+1 na importação OFX com verificação em lote de identificadores.
- [x] Aceitar arquivos OFX 1.x em SGML e manter compatibilidade com OFX 2.x.
- [x] Carregar transações recentes e limitadas nas superfícies de dashboard.
- [x] Marcar categorias de custo fixo para cálculo determinístico do ponto de equilíbrio.
- [x] Ampliar tabelas do PDF e informar categorias não exibidas.
- [x] Centralizar a conversão validada de valores decimais financeiros.
- [x] Implementar parser CSV do Mercado Pago e respectiva importação autorizada.
- [x] Cobrir as melhorias com testes, typecheck, build e validação visual.
- [x] Registrar evidência visual autenticada da conciliação, categorias e layout sem atalho lateral de Alertas.
- [x] Salvar checkpoint das melhorias operacionais (`3ac741a2`).

## Navegação e painéis orientados por perfil

- [x] Remover e-mail e duplicidade de identificação no rodapé da barra lateral.
- [x] Ocultar Conciliação e Relatórios da navegação global do Consultor, preservando-os apenas no contexto do cliente selecionado.
- [x] Criar visão operacional do Consultor Aion com clientes recorrentes, inadimplências, cancelamentos e carteira ativa.
- [x] Permitir registrar o tipo de atendimento do cliente como recorrente ou pontual, sem inferir dados históricos.
- [x] Adequar os relatórios do Consultor a indicadores de operação BPO, sem misturá-los aos relatórios financeiros do cliente.
- [x] Permitir editar a modalidade recorrente ou pontual de clientes já cadastrados.
- [x] Validar que relatórios financeiros e conciliação permanecem disponíveis apenas no contexto de um cliente selecionado.
- [x] Criar painel MEI com calendário de prazos, obrigações próximas e dashboards interativos.
- [x] Validar por teste e navegação autenticada a jornada MEI específica, distinta da gestão empresarial genérica.
- [x] Criar painel Pessoal com assinaturas recorrentes, gastos da semana e acompanhamento de orçamento.
- [x] Persistir assinaturas de serviços para que o painel pessoal não dependa de inferências por descrição.
- [x] Cobrir as novas jornadas com testes, typecheck, build e validação visual por perfil.
- [x] Validar o redirecionamento e o conteúdo da jornada MEI por testes e perfil temporário; login OAuth real dispensado pelo usuário.
- [x] Registrar validação visual das jornadas de Consultor Aion, cliente pessoal e cliente MEI; login OAuth real dispensado pelo usuário.
- [x] Validar a jornada do Consultor Aion após a restauração do papel administrador.
- [x] Registrar o redirecionamento do cliente MEI pela cobertura automatizada; login OAuth real dispensado pelo usuário.
- [x] Criar perfis temporários mínimos para validar as jornadas Pessoal e MEI autorizadas pelo usuário.
- [x] Manter os perfis temporários de validação após os testes, conforme autorizado pelo usuário.
- [x] Alternar temporariamente a conta administradora para os perfis de validação e restaurar o acesso ao fim do teste.
- [x] Salvar checkpoint da reorganização de navegação e painéis (`9ce2cb07`).

## Experiência de seleção e navegação do Consultor

- [x] Criar seletor de cliente no dashboard do Consultor Aion para abrir a visão individual sem sair da operação.
- [x] Tornar a barra lateral recolhível, com estados acessíveis e persistência local da preferência.
- [x] Restaurar o estado recolhido ou expandido da barra lateral ao carregar a aplicação.
- [x] Testar a persistência do estado da barra lateral entre interações simuladas.
- [x] Transformar a identificação do perfil em menu clicável com opções de editar informações e sair.
- [x] Garantir que o menu de perfil funcione de forma apropriada para consultor, empreendedor e cliente pessoal.
- [x] Criar testes, typecheck, build e validação visual das novas interações.
- [x] Salvar checkpoint da experiência de seleção e navegação (`6803159e`).

## Experiência operacional e sistema visual

- [x] Criar seção inicial com alertas recentes e atividades relacionadas ao contexto selecionado.
- [x] Implementar conciliação em lote das movimentações pendentes com confirmação explícita e retorno de resultado.
- [x] Adicionar alternância de modo claro e escuro, com preferência persistente e contraste acessível.
- [x] Refinar tokens de cor, superfícies, tipografia e contraste para uma linguagem financeira editorial e mais distinta.
- [x] Melhorar a hierarquia da tela de conciliação para tornar a ação em lote clara e segura.
- [x] Paginar a listagem de transações em grupos de 20 registros, com controles de navegação acessíveis.
- [x] Criar testes, typecheck, build e validação visual dos fluxos e temas atualizados.
- [x] Salvar checkpoint da experiência operacional e visual.
