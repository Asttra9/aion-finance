# Aion Finance - Devbuild 6.0 - TODO

## Fase 1: Análise e Arquitetura
- [x] Definir identidade visual (cores, tipografia, componentes)
- [x] Documentar arquitetura de dados
- [x] Documentar fluxos de autenticação

## Fase 2: Banco de Dados e Autenticação
- [x] Criar schema de usuários (Consultor Aion, Cliente)
- [x] Implementar sistema de roles e permissões
- [x] Criar tabelas de clientes e relacionamentos
- [x] Implementar autenticação OAuth com dois perfis
- [x] Criar testes de autenticação

## Fase 3: Módulo de Clientes e Dashboard
- [x] Criar tabelas de clientes e perfis financeiros
- [x] Implementar CRUD de clientes (Consultor Aion)
- [x] Criar Dashboard de Saúde Financeira (Consultor + Cliente)
- [x] Implementar indicadores: lucratividade, margem, ponto de equilíbrio
- [x] Implementar DRE Simplificado
- [x] Implementar visão semanal de fluxo de caixa
- [x] Criar página de listagem de clientes
- [x] Criar landing page com features
- [x] Criar testes do dashboard

## Fase 4: Conciliação Bancária
- [x] Criar tabelas para transações e categorias
- [x] Implementar parser OFX
- [x] Criar interface de importação de extratos
- [x] Implementar categorização de entradas/saídas
- [x] Implementar separação pessoal/empresarial
- [ ] Criar testes de importação OFX

## Fase 5: Contas a Pagar/Receber e Relatórios
- [x] Criar tabelas de contas a pagar/receber
- [x] Implementar CRUD de contas
- [x] Implementar sistema de alertas de vencimento
- [x] Criar gerador de relatórios PDF (Fluxo de Caixa, DRE)
- [ ] Implementar layout consultivo profissional
- [ ] Implementar exportação de relatórios
- [ ] Criar testes de relatórios

## Fase 6: Workflow de MEI e Automação
- [x] Criar tabela de workflow de abertura de MEI
- [x] Implementar checklist de etapas
- [ ] Implementar sistema de lembretes de cobrança
- [ ] Integrar notificações para clientes
- [ ] Criar testes de workflow

## Fase 7: Testes e Entrega
- [ ] Executar testes de integração
- [ ] Validar fluxos de usuário
- [ ] Ajustes de UI/UX
- [ ] Criar checkpoint final
- [ ] Documentar API e procedimentos

---

## Notas de Implementação

### Arquitetura de Dados
- **Usuários**: Dois roles - `consultor_aion` e `cliente`
- **Clientes**: Vinculados a um consultor, com perfil financeiro
- **Transações**: Importadas de OFX, categorizadas e vinculadas a clientes
- **Relatórios**: Gerados sob demanda, armazenados em S3
- **Arquivos**: OFX e PDFs armazenados em S3, vinculados a clientes

### Design Visual
- Identidade visual: Gradiente azul (blue-500 a blue-700) com tema escuro para landing page
- Foco em clareza, profissionalismo e usabilidade
- Componentes shadcn/ui para consistência
- Tailwind CSS 4 para styling
- Dashboard com sidebar navigation

### Segurança
- Separação clara de permissões entre Consultor e Cliente
- Clientes veem apenas seus próprios dados
- Consultores têm acesso total à plataforma
- Arquivos armazenados com controle de acesso

### Componentes Criados
- `AionDashboardLayout`: Layout com sidebar para dashboard
- `Clientes`: Página de listagem e cadastro de clientes
- `Dashboard`: Dashboard com indicadores financeiros e gráficos
- `Home`: Landing page com features e CTA

### Próximas Prioridades
1. Implementar importação de OFX
2. Criar páginas de Contas a Pagar/Receber
3. Implementar geração de relatórios PDF
4. Implementar workflow de MEI
5. Adicionar testes unitários e de integração

