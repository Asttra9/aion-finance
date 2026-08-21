# Especificação — Convites e ativação de contas

## Objetivo

Substituir o acesso por clique da jornada de clientes por um fluxo seguro de criação de conta mediante convite. A solução corrige o logout para retornar diretamente a `/acesso` e cria experiências de ativação distintas para **PF/Pessoal** e **PJ/MEI**, sem permitir que a jornada financeira seja alterada durante a ativação.

## Escopo aprovado

| Componente | Comportamento |
|---|---|
| Logout | Invalida a sessão e encaminha diretamente para `/acesso`, sem depender de rota inexistente. |
| Geração de convite | Disponível somente ao Consultor Aion responsável pelo cliente, a partir do cadastro ou edição da carteira. |
| Entrega inicial | O Consultor copia o link para compartilhá-lo no canal já utilizado com o cliente. O envio automático de e-mail não integra este escopo. |
| Segurança | O token é aleatório, armazenado apenas como hash, vinculado ao cliente e à jornada, expira em sete dias e pode ser revogado ou reemitido. |
| Ativação | Uma página pública valida o token antes de apresentar dados do convite e permite apenas a criação inicial de senha e do perfil de onboarding. |
| Recuperação | Convites expirados, revogados ou utilizados orientam o cliente a solicitar um novo link ao suporte ou consultor. |

## Arquitetura de dados

Uma tabela `account_invites` registra o cliente vinculado, e-mail de destino, hash do token, expiração, data de uso, data de revogação, criador e auditoria de criação. O token puro existe somente durante a geração do link e não é persistido.

Uma tabela `client_onboarding_profiles` mantém o perfil inicial separado de `clients` e dos lançamentos financeiros. O registro é único por cliente, identifica a jornada e armazena somente os campos de onboarding aprovados. Nenhum lançamento, saldo ou extrato é criado pelo formulário.

## Fluxos

### Geração e gestão do convite

O Consultor Aion abre a edição de um cliente elegível e escolhe **Gerar convite de acesso**. O servidor confirma que o solicitante é responsável pelo cliente, invalida convites anteriores ativos quando necessário, cria um token de uso único e devolve o link completo para cópia. O consultor pode revogar um convite ativo ou reemitir outro quando o link expirar.

### Ativação PF/Pessoal

A rota `/ativar-conta?token=...` confirma a validade do convite e mostra uma progressão curta. A pessoa confere os dados de identificação já informados, seleciona seu objetivo financeiro e faixa de renda, define e confirma sua senha. O resultado é uma conta pessoal vinculada ao cliente e um perfil inicial para orçamento e metas.

### Ativação PJ/MEI

A mesma rota identifica a jornada empresarial do convite e mostra uma progressão própria. A pessoa confere os dados de identificação, informa razão social, CNPJ com máscara e validação, segmento, faixa de faturamento e método atual de controle financeiro, depois define e confirma sua senha. O resultado é uma conta empresarial vinculada ao cliente e um perfil inicial para a operação financeira.

## Regras de segurança

O servidor compara somente hashes de token, invalida o convite após o uso e impede sua reutilização. A ativação não aceita mudança de e-mail, cliente ou jornada pelo navegador. A senha segue a política de credenciais locais existente, é armazenada somente em hash e cria sessão HTTP-only assinada após sucesso. Erros não revelam se um e-mail existe fora de um convite válido.

## Experiência e acessibilidade

Os dois formulários adotam rótulos explícitos, agrupamento por etapa, mensagens de erro junto ao campo, foco visível e seleção por teclado. A estrutura se inspira no ritmo de metadados, escolhas e progresso do HTML de referência, mas usa os componentes e a identidade institucional da Aion. A página não reproduz textos, estilos ou conteúdo do material fornecido.

## Contratos previstos

| Contrato | Permissão | Resultado |
|---|---|---|
| `accountInvites.create` | Consultor responsável | Gera link único e convite persistido. |
| `accountInvites.revoke` | Consultor responsável | Revoga convite ainda ativo. |
| `accountInvites.getPublic` | Público com token válido | Retorna somente dados mínimos para ativação. |
| `accountInvites.activate` | Público com token válido | Cria ou vincula acesso local, grava onboarding e consome convite. |

## Testes e validação

Os testes cobrirão geração autorizada, bloqueio de consultor não responsável, hash sem token puro, expiração, revogação, consumo único, ativação PF, ativação PJ/MEI, validação de CNPJ, criação de senha e redirecionamento de logout. A validação visual cobrirá o estado inicial, etapas das duas jornadas, erros de token e retorno ao acesso após sair.

## Limites desta entrega

O convite não envia e-mail automaticamente, não cria dados financeiros fictícios, não permite alterar a jornada do cliente e não substitui o suporte para recuperação de conta. Integração de e-mail, notificações e auditoria ampliada podem ser adicionadas posteriormente sobre os mesmos contratos.
