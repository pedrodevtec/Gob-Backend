# 4 Critérios Bravantus para Identificar Hotspots de IA, Sistema e Governança

**O que é:** conjunto de 4 perguntas para identificar, dentro de um fluxo mapeado do Bravantus, quais etapas são candidatas a apoio de IA, automação, validação técnica, checklist, regra de manual ou governança de permissões.

**Quando é usado:** após mapear um fluxo com as Perguntas 2 a 5 do Framework Bravantus.

**Filosofia:** nem todo passo precisa de IA. Em Bravantus, hotspot é o cruzamento entre **IA/sistema lida bem com isso**, **vale a pena mexer** e **existe limite claro para não quebrar regra, canon, spoiler ou autonomia humana**.

Uma atividade que responde **SIM em pelo menos 3 das 4 perguntas** é candidata forte a hotspot.

---

## Critério 1 · É recorrente ou repetitivo?

**Pergunta:** *Essa atividade acontece repetidamente em mesas, episódios, personagens, crônicas, revisões ou desenvolvimento?*

### Por que importa

IA, automação e checklists geram mais valor quando existe repetição. Uma etapa única e altamente autoral pode precisar de decisão humana, não de automação. Já uma etapa que se repete em toda mesa pode ganhar padrão, validação e apoio.

### Sinais de SIM

- Acontece em toda criação de personagem.
- Acontece em toda missão ou episódio.
- O Mestre precisa fazer sempre o mesmo tipo de análise.
- O Autor repete o mesmo tipo de revisão de canon.
- O dev precisa transformar sempre regras em critérios de aceite.
- Existe uma sequência mental repetida.

### Sinais de NÃO

- É uma decisão única de lore central.
- Depende de inspiração autoral irrepetível.
- É uma escolha estratégica rara.
- É uma cena única que deve permanecer humana.

### Exemplos Bravantus

| Atividade | Hotspot? | Motivo |
|---|---|---|
| Validar se ficha tem todos os campos obrigatórios | Sim | Repetitivo e baseado em regra |
| Gerar rascunho de crônica a partir de ações aprovadas | Sim | Repetitivo por episódio |
| Decidir a origem final da Chama Negra | Não | Decisão autoral/canon secreto |
| Escolher nome oficial do produto | Não | Estratégico e pouco recorrente |

---

## Critério 2 · É baseado em texto, ficha, regra, evento ou dado estruturado?

**Pergunta:** *A atividade envolve ler, escrever, extrair, comparar, resumir, classificar ou validar texto, ficha, regra, evento, rolagem ou dado estruturado?*

### Por que importa

IA e sistemas ajudam muito quando a entrada e a saída podem ser representadas como texto ou dados. Em Bravantus, isso inclui ficha de personagem, ação do jogador, resultado de D20, trecho de lore, regra de manual, evento de crônica e metadados de visibilidade.

### Sinais de SIM

- Input é texto de jogador, Mestre ou Autor.
- Output é resumo, sugestão, tabela, validação ou crônica.
- Existe ficha com campos estruturados.
- Existe regra do Manual do Jogador ou do Mestre.
- Existe resultado de dado a interpretar.
- Existe classificação de visibilidade ou spoiler.

### Sinais de NÃO

- Depende de atuação emocional ao vivo.
- Depende de negociação humana complexa.
- Exige decisão política/autoridade fora do sistema.
- Não pode ser descrito em texto, regra ou dado.

### Exemplos Bravantus

| Atividade | Hotspot? | Intervenção possível |
|---|---|---|
| Transformar ação aprovada em resumo narrativo | Sim | IA gera rascunho, Mestre aprova |
| Validar se uma Marca contradiz o setting | Sim | Checklist + IA de consistência |
| Rolar o dado pelo jogador sem autorização | Não | O sistema pode rolar, mas IA não deve manipular |
| Interpretar conflito emocional profundo entre jogadores | Cuidado | IA pode sugerir texto, Mestre/jogadores decidem |

---

## Critério 3 · Tem regras, critérios ou limites estáveis?

**Pergunta:** *Existe um conjunto de regras, critérios, padrões ou limites que orienta como essa atividade deve ser feita?*

### Por que importa

IA segue instruções. Sistema valida regra. Se o critério está claro, dá para criar prompt, checklist, função, validação, endpoint ou política de acesso. Se tudo está no feeling, primeiro precisamos documentar.

### Tipos de regra em Bravantus

| Tipo de regra | Exemplo |
|---|---|
| Regra de RPG | D20, dificuldade, atributos, PV, Energia, Ascensão |
| Regra de personagem | campos obrigatórios, arquétipo, equipamentos, Marca |
| Regra de canon | o que é oficial, mesa, rascunho ou crônica pública |
| Regra de spoiler | público, jogadores, Mestre, autor, oculto até revelar |
| Regra de IA | IA sugere, resume e valida; nunca decide ou publica sozinha |
| Regra técnica | RBAC, ABAC, audit log, aprovação humana, versionamento |
| Regra editorial | tom, vocabulário, estilo de Bravantus, termos proibidos |

### Sinais de SIM

- Existe uma regra no manual.
- Existe checklist mental que pode ser escrito.
- Existe critério de aceite.
- Existe papel autorizado a aprovar.
- Existe visibilidade definida.
- Existe padrão de resposta esperado.

### Sinais de NÃO

- O Autor ainda não decidiu.
- O Mestre decide sempre de forma diferente.
- A regra depende de segredo ainda não escrito.
- Não há consenso entre manual, produto e sistema.

### Exemplos Bravantus

| Atividade | Tem regra estável? | Ação recomendada |
|---|---|---|
| Validar atributos na ficha | Sim | Validação de sistema |
| Sugerir consequência para falha no D20 | Parcial | Criar tabela no Manual do Mestre |
| Definir origem dos Guardiões | Não | Decisão autoral antes de IA |
| Remover spoiler da crônica pública | Sim | IA + checklist + aprovação do Mestre |

---

## Critério 4 · É gargalo real, risco crítico ou ponto de escala?

**Pergunta:** *Essa atividade consome tempo desproporcional, atrasa a experiência, gera retrabalho, expõe spoiler, quebra canon, confunde jogador ou bloqueia desenvolvimento?*

### Por que importa

Uma atividade pode ser repetitiva, textual e com regra, mas ainda assim não valer intervenção se for rápida e sem risco. Hotspot real libera tempo, reduz erro, protege canon ou destrava fluxo.

### Sinais de SIM

- O Mestre gasta muito tempo revisando ações ou fichas.
- O jogador trava porque não sabe escrever ou escolher.
- O Autor precisa revisar inconsistência toda vez.
- A IA pode revelar conteúdo indevido se não houver filtro.
- O desenvolvimento trava por falta de regra clara.
- A crônica pública exige muito retrabalho.
- Outros fluxos dependem dessa etapa.

### Sinais de NÃO

- Leva poucos minutos e não causa dúvida.
- Não afeta experiência central.
- Não tem risco de canon, regra ou spoiler.
- Não bloqueia ninguém.

### Exemplos Bravantus

| Atividade | Hotspot? | Motivo |
|---|---|---|
| Aprovar ficha de personagem | Sim | Pode atrasar mesa e quebrar regra/canon |
| Gerar crônica pública | Sim | Alto valor, risco de spoiler, repetitivo |
| Escolher cor de item comum | Não | Baixo risco e baixo impacto |
| Criar segredos finais do setting | Não para IA | Decisão autoral, não automatizável |

---

## Como aplicar os 4 critérios

### Passo 1 · Pegue o mapa do fluxo

Use o Mermaid aprovado no Framework Bravantus.

### Passo 2 · Avalie cada atividade

Tabela de avaliação:

| Atividade | Recorrente? | Texto/dado? | Regra estável? | Gargalo/risco? | Candidato? |
|---|---|---|---|---|---|
| Criar ficha | Sim | Sim | Sim | Sim | Forte |
| Definir segredo do vilão | Não | Sim | Não | Sim | Fraco para IA |
| Gerar crônica | Sim | Sim | Sim | Sim | Forte |

### Passo 3 · Filtre candidatos

- **4 SIM** → hotspot forte.
- **3 SIM** → candidato bom, avaliar esforço.
- **2 SIM** → talvez precise de documento/regra antes.
- **0-1 SIM** → manter humano/manual por enquanto.

### Passo 4 · Classifique o tipo de intervenção

Nem todo hotspot vira IA. Escolha o tipo correto:

| Tipo | Quando usar |
|---|---|
| Prompt orientado | Texto repetitivo com contexto claro |
| Skill de IA | Sequência padronizada de análise/reescrita/classificação |
| Validação técnica | Regra objetiva que sistema pode checar |
| Checklist humano | Decisão precisa de julgamento, mas pode ser guiada |
| Política RBAC/ABAC | Acesso depende de papel, canon, visibilidade ou estado |
| Documento/manual | Ainda falta regra clara antes de automatizar |
| Componente de UI | O usuário precisa ser guiado visualmente |
| Auditoria/log | A decisão precisa ser rastreável |

---

## Limites de IA em hotspots Bravantus

A IA pode:

- Sugerir origem, Marca, detalhe de personagem e fala.
- Reescrever ação do jogador sem mudar intenção.
- Resumir evento aprovado.
- Sugerir consequência para o Mestre.
- Apontar inconsistência com manual ou canon.
- Gerar rascunho de crônica pública.
- Remover spoilers de um texto.
- Criar alternativas, nunca uma decisão final obrigatória.

A IA não pode:

- Alterar resultado de dado.
- Decidir ação do personagem.
- Aprovar ficha sozinha.
- Aplicar morte ou perda permanente sem Mestre.
- Publicar crônica sem aprovação humana.
- Alterar canon oficial.
- Revelar segredo de Mestre ao jogador ou espectador.
- Ignorar regras do Manual do Jogador ou do Mestre.

---

## Card de hotspot Bravantus

```markdown
## Hotspot: [nome]

**Fluxo:** [nome do fluxo]
**Atividade do mapa:** [atividade exata]
**Papel afetado:** [Jogador/Mestre/Autor/Espectador/Sistema/IA]

### Critérios atendidos
- Recorrente? [Sim/Não]
- Texto, ficha, regra, evento ou dado? [Sim/Não]
- Tem regras/limites estáveis? [Sim/Não]
- É gargalo, risco ou ponto de escala? [Sim/Não]

### Risco principal
[Experiência / Canon / Spoiler / Regra / Técnico / IA]

### Intervenção recomendada
[Prompt, skill, checklist, validação técnica, política de acesso, documento, UI]

### Limite da IA
[A IA pode X, mas não pode Y]

### Dono da aprovação
[Autor / Mestre / Admin / Jogador]

### Critério de aceite
[Como saber que a intervenção funcionou]
```

---

## Exemplos de hotspots iniciais para Bravantus

### 1. Criação de personagem

**Intervenção:** assistente de criação que usa apenas conteúdo público do setting para sugerir origem, Marca, medo, desejo e vínculo com Bravantus.

**Limite:** IA não aprova ficha e não revela segredos do Mestre.

### 2. Aprovação de personagem pelo Mestre

**Intervenção:** checklist de consistência com manual, canon, atributos, arquétipo e equipamentos.

**Limite:** IA aponta riscos e sugere ajustes; Mestre decide.

### 3. Resolução de ação com D20

**Intervenção:** sistema calcula rolagem e IA sugere interpretação narrativa conforme resultado.

**Limite:** IA não altera dado e não decide consequência final.

### 4. Crônica da Mesa

**Intervenção:** IA transforma ações e consequências aprovadas em texto narrativo público.

**Limite:** Mestre aprova e escolhe visibilidade antes de publicar.

### 5. Separação de conteúdo Jogador x Mestre

**Intervenção:** classificador de visibilidade e spoiler para documentos e episódios.

**Limite:** conteúdo sensível exige revisão do Autor.

---

## Regra de ouro

**Hotspot bom em Bravantus não é apenas onde a IA pode escrever. É onde IA, sistema ou checklist protegem a experiência de RPG, reduzem retrabalho e mantêm fantasia, regra, canon e spoiler sob controle humano.**
