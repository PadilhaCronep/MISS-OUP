# Plano de Permissoes e Perspectivas - Partido Missao

## 1. Diagnostico do estado atual (baseado no codigo)

Pontos fortes ja existentes:
- Estrutura de campanhas com setores e subsetores (`campaigns`, `campaign_sectors`, `campaign_subsectors`).
- Estrutura de membros por setor (`sector_members`) e tarefas (`campaign_tasks`).
- Base inicial de papeis (`ADMIN`, `COORDENADOR_ESTADUAL`, `COORDENADOR_MUNICIPAL`, `VOLUNTARIO`).

Riscos atuais (criticos):
- A maior parte da autorizacao esta no cliente e em `query/body` (ex.: `role`, `state`, `city`, `volunteerId`), sem validacao forte no servidor.
- Middleware de auth existe (`src/api/middleware/auth.ts`), mas nao esta aplicado nas rotas centrais.
- Inconsistencia de papeis entre front e back (front tem `SUPER_ADMIN`, app usa `ADMIN`, banco usa `ADMIN`).
- Papel unico por usuario (`volunteers.role`) nao cobre cenarios reais de multiplos papeis/escopos.

Conclusao: hoje ha base funcional para organizacao de campanha, mas falta camada central de autorizacao por escopo (territorio + campanha + setor + sensibilidade).

## 2. Objetivo organizacional

Estruturar a plataforma para suportar:
- Administradores nacionais, estaduais e regionais.
- Pre-candidato e chefe de campanha.
- Lideres setoriais (tecnologia, RH, financeiro etc).
- Militancia (publico mais aberto).
- Voluntarios (com tarefas e responsabilidades internas).

Comportamento esperado por tipo de pre-candidato:
- Presidencial: acesso total nacional.
- Governador: acesso total dentro do proprio estado.
- Deputado federal: acesso ao proprio estado e suas campanhas.
- Deputado estadual: acesso ao proprio estado e suas campanhas.

Observacao: no pedido foi citado "dep. federal" duas vezes; assumi que o segundo era "dep. estadual".

## 3. Modelo recomendado: RBAC + Escopo + Contexto

Usar 3 eixos simultaneos:
- Papel: o que pode fazer.
- Escopo: onde pode fazer.
- Contexto: em qual campanha/setor pode fazer.

### 3.1 Papeis canonicos

Nucleo institucional:
- `ADMIN_NACIONAL`
- `ADMIN_ESTADUAL`
- `ADMIN_REGIONAL`

Nucleo campanha:
- `PRE_CANDIDATO`
- `CHEFE_CAMPANHA`
- `COORDENADOR_CAMPANHA`

Nucleo setorial:
- `LIDER_SETOR`
- `MEMBRO_SETOR`

Base:
- `MILITANTE`
- `VOLUNTARIO`

### 3.2 Escopos canonicos

- `NACIONAL`
- `ESTADUAL` (UF)
- `REGIONAL` (agrupamento de cidades)
- `MUNICIPAL`
- `CAMPANHA`
- `SETOR`
- `PROPRIO_USUARIO` (self)

## 4. Matriz de perspectiva (o que cada perfil enxerga)

### 4.1 Administracao

- `ADMIN_NACIONAL`: tudo (todos estados, regioes, campanhas, relatorios, auditoria, gestao de papeis).
- `ADMIN_ESTADUAL`: tudo do estado (usuarios, campanhas, inteligencia, financeiro do estado).
- `ADMIN_REGIONAL`: tudo da regiao (cidades da regiao, campanhas ligadas a regiao).

### 4.2 Campanha

- `PRE_CANDIDATO` presidencial: visao total nacional e de todas as campanhas vinculadas.
- `PRE_CANDIDATO` governador: visao total do seu estado.
- `PRE_CANDIDATO` deputado federal/estadual: visao total da propria campanha + estado de atuacao.
- `CHEFE_CAMPANHA`: gestao completa da campanha especifica (tarefas, setores, membros, performance, relatorios da campanha).

### 4.3 Setores

- `LIDER_SETOR`: gestao do proprio setor (membros do setor, backlog, avaliacoes do setor, onboarding do setor).
- `MEMBRO_SETOR`/`VOLUNTARIO`: tarefas atribuidas, entregas, progresso e feedback da propria atuacao.

### 4.4 Base aberta

- `MILITANTE`: conteudo publico, mobilizacao, trilhas abertas, missoes abertas.
- Restricoes de militante: sem acesso a dados sensiveis de pessoas, sem financeiro, sem gestao de papeis.

## 5. Regras de autorizacao (resumo pratico)

Regra 1: usuario nunca define o proprio escopo por `query/body`.
- Escopo vem do token + vinculos de acesso no banco.

Regra 2: todo endpoint sensivel deve passar por `requireAuth` + `authorize(resource, action, context)`.

Regra 3: prioridade de avaliacao:
1. `ADMIN_NACIONAL` permite.
2. Papel com escopo exato permite.
3. Sem escopo valido nega.

Regra 4: sempre filtrar no SQL por escopo permitido.
- Exemplo: admin estadual SP nao recebe dados de RJ.

## 6. Modelo de dados recomendado (extensao do banco atual)

Adicionar tabela de vinculos de acesso para suportar multi-papel e multi-escopo:

```sql
CREATE TABLE IF NOT EXISTS access_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  scope_type TEXT NOT NULL,      -- NACIONAL|ESTADUAL|REGIONAL|MUNICIPAL|CAMPANHA|SETOR|PROPRIO_USUARIO
  scope_ref TEXT,                -- ex: 'SP', 'reg-sudeste-1', 'camp-abc', 'setor-rh'
  office_context TEXT,           -- PRESIDENTE|GOVERNADOR|DEP_FEDERAL|DEP_ESTADUAL|...
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Evolucoes recomendadas:
- Manter `volunteers.role` apenas como legado/exibicao.
- Fonte oficial de permissao passa a ser `access_bindings`.
- Opcional: tabela `regions` para mapear cidades -> regiao.

## 7. Motor de autorizacao (funcao central)

Criar modulo unico, por exemplo `src/lib/authorization.ts`:
- Entrada: usuario autenticado + contexto da rota/recurso.
- Saida: `allow`/`deny` + motivo.

Exemplo de assinatura:

```ts
type Action = 'read' | 'create' | 'update' | 'delete' | 'assign' | 'approve' | 'manage_roles';
type Resource = 'dashboard' | 'volunteers' | 'campaigns' | 'tasks' | 'finances' | 'reports' | 'intelligence';

function can(
  actor: AuthActor,
  action: Action,
  resource: Resource,
  ctx: { state?: string; regionId?: string; campaignId?: string; sectorId?: string; ownerId?: string }
): boolean
```

## 8. Ajustes necessarios nas rotas atuais

Trocar padrao atual:
- De: `/coordenador/dashboard?state=...&role=...`
- Para: `/coordenador/dashboard` (escopo inferido no backend).

Trocar padrao atual:
- De: `/voluntario/minha-funcao?volunteerId=...`
- Para: `/voluntario/minha-funcao` (sempre do usuario logado).

Aplicar mesmo principio para:
- `/coordenador/voluntarios`
- `/coordenador/territorios`
- `/coordenador/campanhas`
- `/coordenador/campanha/:id/...`
- `/notificacoes`

## 9. Fluxo por perfil (resumo de produto)

- Administrador nacional:
  - Escolhe visao: Brasil > estado > regiao > campanha.
- Administrador estadual:
  - Enxerga somente UF vinculada.
- Administrador regional:
  - Enxerga somente cidades da regiao.
- Pre-candidato:
  - Recebe painel estrategico conforme cargo (presidencial, governador, dep federal, dep estadual).
- Chefe de campanha:
  - Opera rotina diaria da campanha.
- Lider de setor:
  - Garante entrega do seu setor.
- Militante:
  - Atua em base aberta.
- Voluntario:
  - Atua em tarefas internas atribuidas.

## 10. Plano de implementacao em fases

### Fase 1 (seguranca minima imediata)
- Ativar auth real no backend para endpoints sensiveis.
- Remover dependencia de `role/state/city/volunteerId` enviados pelo cliente.
- Corrigir divergencia de enums de papel no front/back.

### Fase 2 (modelo de acesso)
- Criar `access_bindings`.
- Migrar papeis existentes para bindings iniciais.
- Criar helpers de escopo (estado, regiao, campanha, setor).

### Fase 3 (policy engine)
- Implementar `can(...)` central.
- Aplicar middleware de autorizacao por recurso/acao.
- Filtrar queries com escopo obrigatorio.

### Fase 4 (perspectivas de UX)
- Menu e dashboards por perfil.
- Views especificas por tipo de pre-candidato.
- Visao de militante e voluntario separadas.

### Fase 5 (auditoria e governanca)
- Log de acesso negado/permitido.
- Trilha de alteracoes de papeis.
- Relatorio de conformidade de permissao.

## 11. Criterios de aceite (exemplos)

- Admin estadual de SP nao acessa dados de RJ.
- Pre-candidato governador de MG nao enxerga financeiro de SP.
- Lider de setor RH nao altera tarefas do setor tecnologia.
- Militante nao acessa dados pessoais sensiveis de voluntarios.
- Voluntario so altera tarefas atribuidas a ele.
- Presidencial com papel correto acessa visao nacional completa.

## 12. Decisao de arquitetura

Recomendacao final:
- Seguir com RBAC + escopo no backend, mantendo o cliente apenas como camada de exibicao.
- Evitar logica de permissao no front como fonte de verdade.
- Implementar em fases para reduzir risco e permitir validacao rapida de negocio.

