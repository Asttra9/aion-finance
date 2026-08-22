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

## Correções de navegação e extensões operacionais

- [x] Corrigir a alternância persistente do modo claro e escuro no menu de perfil.
- [x] Corrigir o comportamento e o espaçamento da barra lateral quando recolhida.
- [x] Integrar filtros avançados de período e categoria nas movimentações financeiras.
- [x] Criar central de notificações com leitura, resolução e contexto da pendência.
- [x] Adicionar exportação CSV autorizada para relatórios operacionais.
- [x] Garantir que o perfil do cliente final exiba somente o resumo financeiro pertinente e ações pessoais.
- [x] Corrigir a superfície fixa clara e o contraste insuficiente do painel de categorias no modo escuro.
- [x] Criar ou atualizar testes, typecheck, build e validação visual destas correções.
- [x] Salvar checkpoint das correções de navegação e extensões operacionais.

## Indicadores, relatórios e recorrências por perfil

- [x] Criar comparativos mensais simplificados para a jornada pessoal do cliente final.
- [x] Criar indicadores mensais gerenciais para MEI e empreendedor, proporcionais à operação.
- [x] Exibir custos fixos e fluxo líquido mensal na visão gerencial do MEI, usando categorias e lançamentos reais.
- [x] Reposicionar a Evolução do Mês no topo do dashboard, junto ao histórico e aos indicadores do período.
- [x] Adicionar ordenação de lançamentos por data, do mais recente ao mais antigo e vice-versa.
- [x] Corrigir a atualização da listagem após novos lançamentos operacionais da Aion.
- [x] Permitir exportação de resumo financeiro pessoal em PDF.
- [x] Permitir exportação de DRE gerencial em PDF para MEI e empreendedor.
- [x] Implementar contas recorrentes e assinaturas com geração de lançamentos previstos.
- [x] Exibir um seletor acessível de ordenação por data nas movimentações e cobrir sua interação em teste.
- [x] Exibir previsões recorrentes e compromissos futuros nas jornadas pessoal e MEI, respeitando as permissões de confirmação.
- [x] Cobrir criação, geração idempotente, confirmação e permissões das recorrências por testes automatizados.
- [x] Criar ou atualizar testes, typecheck, build e validação visual dos novos fluxos.
- [x] Mover a evolução mensal para o topo da visão empresarial do dashboard principal.
- [x] Exibir previsões recorrentes e compromissos futuros diretamente na jornada MEI.
- [x] Concluir a validação visual autenticada dos fluxos pessoal e MEI com dados representativos, sem criar dados financeiros fictícios.
- [x] Reorganizar explicitamente a visão empresarial em `Dashboard.tsx`, sem depender de reordenação global por CSS.
- [x] Confirmar a apresentação de compromissos recorrentes na jornada pessoal sem expor controles BPO.
- [x] Cobrir em teste a ordem das seções analíticas da visão empresarial e a separação de permissões das previsões.
- [x] Salvar checkpoint dos indicadores, relatórios e recorrências por perfil.
- [x] Importar o extrato OFX fornecido pelo usuário no perfil MEI temporário para validação com dados reais.
- [x] Exibir o período mais recente com movimentação nos indicadores mensais quando o mês corrente não tiver dados.
- [x] Permitir que o Consultor Aion edite os dados cadastrais de clientes já incluídos no sistema.
- [x] Incluir endereço físico no cadastro e na edição autorizada de clientes, sem alterar sua jornada financeira.
- [x] Restringir a edição cadastral direta ao Consultor Aion e orientar clientes a acionarem o suporte para alterações.
- [x] Validar a persistência de endereço, CPF/CNPJ e demais dados cadastrais nos fluxos de criação e edição.
- [x] Exibir os dados cadastrais do cliente em modo somente leitura, com orientação explícita para solicitar alterações ao suporte.
- [x] Aplicar formatação e validação visual de CPF/CNPJ nos formulários cadastrais de clientes.
- [x] Renomear a entrada inicial do Consultor Aion para Visão Geral e remover a duplicação da área BPO nesse painel.
- [x] Ocultar a aba lateral de Clientes para o Consultor, preservando acesso útil à carteira por ações contextuais.
- [x] Tornar o seletor de clientes integralmente acionável e remover o item estático “Abrir dashboard de cliente”.
- [x] Adicionar acesso direto à carteira completa de clientes na Operação BPO.
- [x] Redesenhar a Visão Geral com gráfico de tendência em largura total acima do Foco do Dia.
- [x] Transformar a Operação BPO em painel analítico com KPIs e projeções acionáveis, removendo textos explicativos internos.
- [x] Corrigir a proporção visual dos itens ativos quando a barra lateral estiver recolhida.
- [x] Ancorar a tendência consolidada do Consultor Aion no último período com movimentações quando não houver dados no mês corrente.
- [x] Ajustar a escala monetária dos gráficos consultivos para valores abaixo de mil reais permanecerem legíveis.
- [x] Substituir o acesso aparente por login funcional com validação de credenciais e sessão protegida.
- [x] Preservar o redirecionamento por jornada somente após autenticação bem-sucedida.
- [x] Armazenar hashes de senha e estado de acesso no cadastro de usuários, sem criar senhas padrão.
- [x] Implementar login por e-mail e senha com sessão HTTP-only expirada e encerramento seguro.
- [x] Permitir que somente o Consultor Aion provisione ou redefina o acesso de clientes.
- [x] Exibir recuperação de acesso orientada ao suporte, sem expor fluxos de redefinição inseguros.
- [x] Corrigir o logout para redirecionar diretamente à tela de acesso, sem erro 404.
- [x] Criar convites seguros para novas contas MEI/Microempresa e Pessoal/Família, gerados somente pelo Consultor Aion.
- [x] Criar página pública de ativação por convite para cadastro inicial e definição de senha.
- [x] Expirar, invalidar e impedir reutilização de convites de criação de conta.
- [x] Diferenciar a ativação PF/Pessoal com dados individuais e preferências de organização financeira.
- [x] Diferenciar a ativação PJ/MEI com razão social, dados empresariais e informações operacionais essenciais.
- [x] Coletar na ativação PF objetivo financeiro e faixa de renda sem exigir lançamentos iniciais.
- [x] Coletar na ativação PJ/MEI razão social, CNPJ, segmento, faixa de faturamento e método de controle financeiro.
- [x] Cobrir convite, ativação, expiração, revogação, uso único e logout com testes automatizados.
- [x] Validar typecheck, testes, build e telas públicas de ativação antes do checkpoint.
- [x] Salvar checkpoint da entrega de logout, convites e ativação de contas (`5bc79410`).

## Notificações personalizadas

- [ ] Definir canais, perfis, gatilhos e regras de preferência para notificações personalizadas.
- [ ] Implementar notificações personalizadas aprovadas para as jornadas da Aion Finance.
- [ ] Cobrir e validar o novo fluxo de notificações antes do checkpoint.

## Prioridade atual — autenticação

- [x] Concluir a validação final do login, logout e ativação de conta por convite antes de iniciar notificações personalizadas.

## Solicitação pública de conta com aprovação

- [x] Definir o fluxo de solicitação pública por e-mail e senha, com status pendente e regras de revisão.
- [x] Manter as solicitações de conta em estrutura independente da carteira até a aprovação.
- [x] Permitir que o solicitante escolha o Consultor Aion responsável, restringindo a decisão a esse consultor.
- [x] Coletar a jornada desejada — Pessoal/Família ou MEI/Microempresa — junto ao nome, e-mail e senha da solicitação.
- [x] Ativar, após aprovação, a conta com o hash da senha enviado na solicitação, sem sessão anterior à decisão.
- [x] Permitir nova solicitação após recusa e impedir duplicidades enquanto houver pedido pendente para o e-mail.
- [x] Exibir a solicitação em fila interna e no sino do Consultor Aion selecionado, com ações auditáveis de aprovar ou recusar.
- [x] Identificar a fila de análise e decisão como Aion — Moderação.
- [x] Criar armazenamento seguro para solicitações de conta, incluindo hash de senha e prevenção de duplicidade.
- [x] Criar uma tela pública de solicitação de conta com confirmação de recebimento.
- [x] Criar uma fila consultiva para aprovar ou recusar solicitações de conta sem liberar acesso antes da decisão.
- [x] Cobrir, validar e salvar checkpoint do fluxo de solicitação e aprovação de conta (`a48cc079`).
- [x] Revalidar e salvar checkpoint após restringir a lista pública de consultores ao nome e identificador (`fafeaa34`).
- [x] Validar e salvar checkpoint da proteção contra criação de cliente duplicado pelo mesmo e-mail.
