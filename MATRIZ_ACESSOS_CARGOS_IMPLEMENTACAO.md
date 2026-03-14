# Matriz de Acessos e Permissoes - Implementacao Atual

## Objetivo
Padronizar acesso por cargo e escopo, mantendo todas as funcionalidades existentes e adicionando UX por perspectiva.

## Principios aplicados
- Backend como fonte de verdade de permissao.
- Login por sessao (token) com modo local facilitado (`AUTH_DEV_MODE=true`).
- Escopo por vinculos (`access_bindings`), nao por parametros enviados pelo cliente.
- Todas as pessoas autenticadas iniciam no mapa de competicao (`/`).

## Mapa inicial para todos os perfis
- Rota: `GET /api/arena/mapa-inicial`
- Disponivel para qualquer usuario autenticado.
- Mostra metas e competicao interna por estado:
  - captacao de voluntarios
  - projetos/campanhas
  - seguidores estimados e ganho 30d
  - ranking por estado

## Matriz cargo x demanda de acesso

1. `ADMIN_NACIONAL`
- Escopo: nacional.
- Visao: tudo (usuarios, campanhas, setores, tarefas, relatorios, arena).
- Acoes: leitura/gestao completa.

2. `ADMIN_ESTADUAL`
- Escopo: estado vinculado.
- Visao: dados do estado (campanhas, voluntarios, indicadores).
- Acoes: gestao dentro do estado.

3. `ADMIN_REGIONAL`
- Escopo: municipal/regional vinculado.
- Visao: cidades e campanhas da regiao.
- Acoes: gestao da regiao.

4. `PRE_CANDIDATO` presidencial
- Escopo: nacional.
- Visao: total nacional.
- Acoes: mesmas capacidades estrategicas de coordenacao nacional.

5. `PRE_CANDIDATO` governador
- Escopo: estadual.
- Visao: total do proprio estado.
- Acoes: coordenacao completa no estado.

6. `PRE_CANDIDATO` dep. federal / dep. estadual
- Escopo: estadual + campanhas vinculadas.
- Visao: campanhas e operacao no estado de atuacao.
- Acoes: coordenacao dentro desse escopo.

7. `CHEFE_CAMPANHA`
- Escopo: campanha e/ou estado vinculado.
- Visao: operacao completa da campanha.
- Acoes: criar/editar tarefas, alocar pessoas, acompanhar desempenho.

8. `COORDENADOR_CAMPANHA`
- Escopo: campanha vinculada.
- Visao: full da campanha.
- Acoes: operacao diaria da campanha.

9. `LIDER_SETOR`
- Escopo: setor/campanha/estado vinculado.
- Visao: setor e tarefas relacionadas.
- Acoes: coordenacao setorial.

10. `MEMBRO_SETOR`
- Escopo: campanha/setor de vinculo.
- Visao: tarefas e calendario da campanha onde atua.
- Acoes: atualizar as proprias entregas.

11. `MILITANTE`
- Escopo: proprio usuario (ou campanhas onde for membro).
- Visao: arena, missoes e trilhas; campanha apenas se vinculado.
- Acoes: operacao pessoal e colaboracao em campanha quando membro.

12. `VOLUNTARIO`
- Escopo: proprio usuario + campanhas em que e membro.
- Visao: somente campanhas onde participa.
- Acoes: tarefas/calendario/painel da campanha com edicao apenas das proprias tarefas.

## Implementacoes tecnicas entregues
- `requireAuth` aplicado por padrao nas rotas nao publicas.
- `access_bindings` usado para resolver escopo real de cada usuario.
- Regras centrais:
  - `canAccessCampaign(...)`
  - `canAccessVolunteer(...)`
  - `hasNationalAccess(...)`
- Pre-candidatura presidencial com escopo nacional (binding `PRE_CANDIDATO + NACIONAL + PRESIDENTE`).
- Voluntario com hub de campanhas:
  - `GET /api/voluntario/campanhas`
- Mapa inicial de competicao:
  - `GET /api/arena/mapa-inicial`
- Workspace de campanha com dois modos na mesma tela:
  - coordenacao: gestao completa
  - voluntario/militante: foco operacional e atualizacao das proprias tarefas

## Teste local rapido (sem depender de token externo)
1. Configurar `.env` com `AUTH_DEV_MODE=true`.
2. Subir aplicacao (`npm run dev`).
3. Abrir `/acesso-admin`.
4. Executar seed (`admin`, `voluntarios`, `missoes` ou `all`).
5. Trocar usuario em "Entrar como" para validar perspectiva por cargo.
6. Validar obrigatorios:
- Voluntario: ver apenas campanhas vinculadas em `/voluntario/campanhas`.
- Voluntario: no `/campaign/:id`, consegue alterar apenas tarefa atribuida a ele.
- Pre-candidata presidencial: visao nacional no mapa e coordenacao.
- Pre-candidato governador: visao restrita ao estado.
- Lider/Chefe/Coordenador: gestao completa da campanha no escopo permitido.

## Observacao para producao
Quando for para producao, desligar atalho local:
- `AUTH_DEV_MODE=false`
