# Plano de Gamificacao Estrategica (Implementado)

## Objetivo
Aumentar engajamento individual e coletivo com um sistema simples, transparente e orientado por comportamento humano.

## Fundamentos aplicados
- Metas de curto prazo: desafios semanais com progresso visivel.
- Prova social: ranking por campanhas e estados.
- Progressao: ligas (Bronze, Prata, Ouro, Platina, Diamante).
- Pertencimento: pontuacao coletiva da equipe e acompanhamento de membros ativos.

## Novo backend
Endpoint: `GET /api/gamificacao/hub`

Retorna:
- perfil do usuario;
- indice de engajamento (maestria, impacto, pertencimento, momentum);
- liga atual e progresso;
- desafios da semana;
- ranking de campanhas e estados;
- ranking de pares no estado;
- recomendacoes de proxima acao (nudges);
- principios comportamentais da modelagem.

## Novo frontend
- Tela: `Engajamento` (`/engajamento`)
  - painel estrategico responsivo;
  - desafios com progresso;
  - ranking de equipe e estado;
  - recomendacoes acionaveis;
  - onboarding modal "Como funciona" com persistencia local.

- Tela: `Guia Inicial` (`/guia-inicial`)
  - fluxo recomendado de uso do sistema;
  - passos praticos para adocao no partido;
  - links diretos para operacao.

## Usabilidade e navegacao
- Novo menu com acesso rapido:
  - Arena
  - Engajamento
  - Dashboard
  - Mapa
  - Guia Inicial
  - Formacao
  - Conquistas

- Breadcrumb atualizado para as novas rotas.

## Rotina de uso recomendada no partido
1. Segunda: definir metas semanais por equipe.
2. Diario: executar missoes/tarefas e atualizar status.
3. Quarta: revisar engajamento e nudges.
4. Sexta: revisar ranking e fechar ciclo semanal.

## Proximo nivel (opcional)
- Premiacoes mensais por equipe/estado.
- Missao coletiva nacional com meta compartilhada.
- Regras anti-gaming e auditoria de score para governanca.
