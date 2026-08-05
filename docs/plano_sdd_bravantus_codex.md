<!-- Página 1 -->

# Plano SDD - Guardian of Bravantus

Como transformar o Mapa Macro do Produto em um Software Design Document para orientar Codex, agentes de IA e desenvolvimento técnico.

Contexto: Guardian of Bravantus e primeiro setting Ascendência dos Guardiões. Produto: RPG autoral com Manual do Jogador, Manual do Mestre, sistema D20, mundo próprio, IA assistiva, Crônica da Mesa e plataforma digital.

Ideia central: o SDD vira o contrato do produto. O Codex e outros agentes executam dentro desse contrato, sem decidir canon, regras sensíveis, spoiler ou autonomia do Mestre e do jogador.

## 1. Objetivo do SDD

O SDD deve transformar o Bravantus de um produto criativo amplo em pacotes de decisão claros, testáveis e implementáveis. Ele conecta visão de produto, domínio narrativo, regras de RPG, permissões, IA e tarefas técnicas.

- Reduzir ambiguidade antes de pedir implementação ao Codex.

- Separar produto, domínio e técnica.

- Criar limites explícitos para IA, canon, spoiler e decisões humanas.

- Gerar backlog técnico pequeno, auditável e validável.

- Evitar que agentes inventem arquitetura, regra ou fluxo de jogo.

## 2. Como o Mapa Macro vira módulos do sistema

| Macroprocesso do Bravantus | Módulo sugerido no SDD | Função no produto |
| --- | --- | --- |
| Criação, orientação e aprovação de<br>personagem | Character Builder | Permitir criar ficha, história, Marca, arquétipos,<br>traits, perks e equipamentos com validação. |
| Formação e configuração da mesa | Tables / Campaigns | Criar mesa, definir Mestre, limite de jogadores,<br>convites e ponto de partida. |
| Bíblia de Mundo Jogável de Lacius | Settings / Lore | Organizar canon público, canon secreto, regiões,<br>cidades, facções e impérios. |
| Sistema D20 e regras centrais | Rules Engine D20 | Representar testes, dificuldade, resultados,<br>progressão e consequências. |
| Cenários, episódios e aventuras | Episodes / Quests | Transformar lore em missões jogáveis, objetivos,<br>conflitos e ganchos. |
| Crônica da Mesa e Livro da<br>Campanha | Chronicle | Registrar eventos aprovados e gerar narrativa<br>pública em estilo bardo. |
| IA contextual e governança<br>narrativa | AI Assistant + Governance | Sugerir, perguntar, resumir e apoiar com limites<br>claros e aprovação humana. |
| Manuais do Jogador e do Mestre | Knowledge Base / Rules Docs | Servir como fonte de verdade para regras,<br>orientação e validações. |
| Comunicação e comunidade | Community / Onboarding | Conectar Instagram, site, Discord e formação de<br>mesas. |
| Experiência digital inicial | MVP Experience | Apresentar o mundo, sustentar uso, encantar<br>visualmente e incentivar retorno. |

## 3. Estrutura recomendada do SDD

---

<!-- Página 2 -->

| Seção | Conteúdo esperado | Por que ajuda o Codex |
| --- | --- | --- |
| 1. Visão do Produto | O que é Bravantus, setting inicial, público-alvo,<br>experiência principal e hipótese do MVP. | Evita implementação genérica e ancora<br>decisões no produto real. |
| 2. Princípios do Produto | RPG antes de dashboard; IA apoia, mas não<br>decide; canon e spoiler são centrais. | Define limites de comportamento para<br>qualquer implementação. |
| 3. Papéis do Sistema | Autor, Admin, Mestre, Jogador, Espectador e IA<br>Assistente. | Ajuda a criar permissões, fluxos e<br>visibilidade corretamente. |
| 4. Mapa Macro de<br>Módulos | Character Builder, Campaigns, Lore, D20,<br>Episodes, Chronicle, AI, Manuals e Community. | Organiza o repositório e o backlog por<br>domínio. |
| 5. Fluxos Principais | Para cada fluxo: objetivo, entrada, etapas, entrega,<br>aceite, riscos, permissões e IA permitida. | Transforma produto em tarefas técnicas<br>pequenas. |
| 6. Modelo de Domínio | Entidades, relacionamentos, estados, visibilidade,<br>canon e auditoria. | Orienta banco, APIs, validações e testes. |
| 7. Arquitetura Proposta | Frontend, backend, banco, IA, jobs, eventos e<br>integrações futuras. | Dá direção técnica sem iniciar<br>desenvolvimento sem critério. |
| 8. Contrato de IA | Contexto permitido/proibido, ações<br>permitidas/proibidas, aprovação humana e logs. | Impede que IA revele spoiler, invente<br>canon ou decida pelo Mestre. |
| 9. Roadmap Técnico | MVP 0.1, playtest interno, crônica pública,<br>comunidade e evolução de IA. | Ajuda a priorizar etapas e evitar escopo<br>infinito. |

---

<!-- Página 3 -->

## 4. Estrutura de arquivos sugerida

Em vez de um único documento gigante, a recomendação é criar documentos pequenos, versionáveis e fáceis de serem usados por agentes.

/docs /sdd 00-product-vision.md 01-domain-model.md 02-roles-permissions.md 03-character-builder.md 04-table-campaigns.md 05-settings-lore.md 06-rules-engine-d20.md 07-episodes-quests.md 08-chronicle.md 09-ai-governance.md 10-mvp-roadmap.md AGENTS.md

AGENTS.md: deve conter instruções globais para o Codex, como padrões do projeto, limites de escopo, comandos de teste, regras para não alterar autenticação sem pedido explícito, e referência obrigatória aos documentos /docs/sdd antes de implementar.

## 5. Modos de uso do Codex com o SDD

| Modo | Prompt-base | Resultado esperado |
| --- | --- | --- |
| Arquiteto revisor | Leia /docs/sdd e analise se o domínio está coerente. Não<br>implemente código. Liste lacunas, ambiguidades, riscos<br>técnicos e conflitos entre produto, regra e arquitetura. | Relatório de riscos e inconsistências<br>antes de qualquer implementação. |
| Gerador de backlog | Com base no SDD do Character Builder, gere cards<br>técnicos pequenos. Cada card deve ter objetivo, arquivos<br>prováveis, critérios de aceite e riscos. Não altere código. | Backlog técnico pronto para<br>execução controlada. |
| Implementador<br>controlado | Implemente apenas o Card 01 do módulo Character<br>Builder. Não implemente IA. Não altere autenticação. Crie<br>testes básicos e explique como validar. | Feature pequena, limitada e<br>testável. |
| Auditor | Revise a implementação contra o SDD. Aponte<br>divergências entre código e especificação. Classifique<br>como bloqueante, importante ou melhoria. Não faça<br>alterações. | Checklist de conformidade entre<br>código e especificação. |

## 6. Separação essencial: produto, domínio e técnica

| Camada | Pergunta que responde | Exemplo em Bravantus |
| --- | --- | --- |
| Produto | Por que isso existe? | A Crônica existe para transformar sessões em história viva<br>e conteúdo para espectadores. |
| Domínio | O que precisa ser representado? | Sessão, evento, personagem, ação, consequência,<br>visibilidade e canon. |
| Técnica | Como o sistema implementa? | Tabelas, endpoints, telas, prompts, permissões, auditoria e<br>testes. |

Se essas três camadas forem misturadas, o Codex tende a criar soluções genéricas. Se forem separadas, ele passa a operar como executor dentro de um contrato claro.

## 7. Ordem recomendada para começar

O primeiro SDD não deve tentar cobrir a plataforma inteira em profundidade. A melhor ordem é começar pelos documentos que reduzem mais ambiguidade e protegem o produto.

---

<!-- Página 4 -->

| Ordem | Documento | Objetivo |
| --- | --- | --- |
| 1 | SDD 00 - Visão do Produto e Princípios | Fixar a proposta, o MVP e as regras de ouro do produto. |
| 2 | SDD 01 - Modelo de Domínio | Definir entidades e relações principais antes de banco e API. |
| 3 | SDD 02 - Papéis, permissões e<br>visibilidade | Proteger canon, spoilers e responsabilidades humanas. |
| 4 | SDD 03 - Criação de Personagem | Criar o primeiro fluxo jogável central para o player. |
| 5 | SDD 04 - Crônica da Mesa | Transformar sessões em narrativa pública e artefato de campanha. |
| 6 | SDD 05 - Governança de IA | Definir onde a IA pergunta, sugere, resume e onde ela nunca<br>decide. |

## 8. Exemplo de prompt técnico controlado

Leia os documentos:

- `/docs/sdd/00-product-vision.md`
- `/docs/sdd/01-domain-model.md`
- `/docs/sdd/02-roles-permissions.md`
- `/docs/sdd/03-character-builder.md`

Tarefa: Implemente apenas a estrutura inicial do módulo Character Builder.

Restrições:

- Não implemente IA nesta etapa.
- Não altere autenticação.
- Não altere layout global.
- Não crie regras que não estejam no SDD.
- Quando faltar decisão de produto, registre como TODO técnico e não invente.

Entrega esperada:

- Modelos/entidades necessárias.
- Endpoints mínimos para criar e salvar ficha em rascunho.
- Validações básicas descritas no SDD.
- Testes básicos.
- Relatório final com arquivos alterados e como validar.

## 9. Recomendação final

A melhor forma de explorar Codex no Bravantus é usar o SDD como contrato e trabalhar por módulos pequenos. Primeiro, documente visão, domínio, papéis e permissões. Depois, implemente um fluxo central, como Character Builder ou Crônica da Mesa. Por fim, conecte IA somente quando as regras de contexto, visibilidade e aprovação humana estiverem claras.

Frase-guia: o SDD define os limites; o Codex executa dentro dos limites.
