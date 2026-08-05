<!-- Página 1 -->

# FUNDAÇÃO VISUAL

## Design System v0.1

Uma base visual pequena, coerente e implementável para o primeiro playtest da plataforma.

Fantasia heroica acolhedora. Estrutura de jogo. Tensão controlada pela Corrupção.

PROPOSTA PARA VALIDAÇÃO

JULHO 2026 / PRODUCT OWNER: JOÃO PEDRO

---

<!-- Página 2 -->

01 / FUNDAMENTO
## Por que esta etapa existe

O design system protege a experiência do playtest antes de expandirmos telas.

### RPG ANTES DE DASHBOARD

### PERSONAGEM NO CENTRO

### IDENTIDADE PEQUENA, MAS
### FORTE

O Documento de Produto exige que cada tela reforce personagem, narrativa, decisão ou progressão.

A ficha é o ponto emocional de entrada e deve parecer uma interface de jogo, não um formulário genérico.

O primeiro lançamento pode ser enxuto, porém precisa ser reconhecível e coerente desde o início.

ESCOPO DA v0.1

marca e assinaturas personalidade visual cores e semântica

tipografia espaçamento e formas acessibilidade mínima

---

<!-- Página 3 -->

02 / PERSONALIDADE
## Uma fantasia que convida a jogar

A marca é robusta e heroica; a interface precisa traduzir isso sem perder clareza.

## “Fantasia heroica acolhedora, construída com formas robustas e superfícies
## quentes, que ganha tensão controlada quando a Corrupção se aproxima.”

HERÓICO

ACOLHEDOR

ARTESANAL

MISTERIOSO

JOGÁVEL

dourado seletivo

superfícies quentes

contorno e textura sutil

sinais narrativos

ação e feedback claros

não parecer cassino

não dominar com preto

não sujar a leitura

não esconder informação

não decorar sem função

---

<!-- Página 4 -->

03 / COR DE ORIGEM
## A marca fornece a matéria-prima

Estas cores vêm da logo. Elas não devem ser copiadas indiscriminadamente para todos os componentes.

| Token | Cor |
| --- | --- |
| `brand.gold.300` | `#FFDD72` |
| `brand.gold.500` | `#F7C43F` |
| `brand.gold.700` | `#C47A13` |
| `brand.forest.500` | `#00742E` |
| `brand.forest.700` | `#005D25` |
| `brand.forest.900` | `#014A1E` |
| `brand.brown.900` | `#3D1C15` |
| `brand.shield.dark` | `#3F3627` |

REGRA

Dourado comunica foco e recompensa. Verde comunica proteção e aprovação. Marrom sustenta contornos e profundidade.

---

<!-- Página 5 -->

04 / PALETA SEMÂNTICA
## Cada cor precisa ter um trabalho

Identidade, estado de sistema e contexto narrativo não podem competir.

REGRAS CRÍTICAS

SUPERFÍCIES DARK-FIRST

Cor nunca é a única pista. IA sempre recebe rótulo e ações humanas. Segredo combina permissão, ícone e texto. Corrupção aparece de forma localizada. Verde médio não vira texto pequeno no escuro.

canvas base elevated

## Texto principal

Texto secundário mantém boa leitura e reduz competição.

CONTRASTE

AÇÃO IA SEGREDO CORRUPÇÃO

AA: 4.5:1 para texto normal e 3:1 para texto grande.

---

<!-- Página 6 -->

05 / TIPOGRAFIA
## Fantasia nos títulos, clareza na jornada

Duas famílias bastam para criar personalidade e preservar usabilidade.

CINZEL

# Ascendência dos Guardiões

Títulos especiais, páginas e momentos narrativos. Pesos 600 e 700.

INTER

## Seu personagem está pronto para revisão.

REGRA DE USO

Interface, formulários, regras, instruções e textos longos. Pesos 400 a 700.

Cinzel não entra em campos, botões pequenos, tabelas densas ou parágrafos longos.

A logo continua sendo arte original. Nunca deve ser recriada com Cinzel.
## 48 / 36 / 28

## 20 / 16 / 14 / 12

display, página e seção

componente, corpo, apoio e legenda

---

<!-- Página 7 -->

06 / ESTRUTURA
## Ritmo, forma e elevação

A interface deve ser robusta sem virar uma coleção de molduras medievais.

GRID DE 4 PX

RAIOS

BORDAS

TOQUE

4

6 campo

1 padrão

44 x 44 mínimo

8

10 card

2 ênfase

CARD PADRÃO

PAINEL HERO

## Missão em andamento

## A Marca desperta

Clareza primeiro. Ornamento apenas quando reforça hierarquia ou narrativa.

Recorte inspirado no escudo reservado para ficha, marcos e decisões importantes.

---

<!-- Página 8 -->

07 / CONTEXTOS
## A interface muda de tom, não de identidade

Cada contexto recebe uma ênfase própria sem criar um novo produto.

PREPARAÇÃO

EPISÓDIO ATIVO

SUGESTÃO DA IA

### Quente, guiada e calma.

### Contraste e estado da cena.

### Editável e identificada.

próximo passo evidente

ação atual em evidência

aceitar, editar, descartar

SEGREDO DO MESTRE

CORRUPÇÃO

APROVAÇÃO

### Protegido e explícito.

### Rara e localizada.

### Responsável e estado claros.

acesso e origem visíveis

tensão sem perder leitura

decisão humana registrada

---

<!-- Página 9 -->

08 / USO DA MARCA
## Uma assinatura para cada necessidade

A fonte vetorial é sólida; o próximo trabalho é preparar versões digitais.

HORIZONTAL Cabeçalhos largos e materiais.

PRINCIPAL Escudo verde com nome.

REGRAS INICIAIS

não deformar ou inclinar não recolorir livremente não aplicar sobre fundo ruidoso

não recriar o nome com outra fonte simplificar para favicon e avatar preservar área livre ao redor

---

<!-- Página 10 -->

09 / ACESSIBILIDADE
## Fantasia não pode custar compreensão

A identidade só funciona quando todos conseguem perceber estado, ação e prioridade.

CONTRASTE AA

FOCO VISÍVEL

4.5:1 para texto normal e 3:1 para texto grande.

Anel dourado em toda navegação por teclado.

COR + RÓTULO

ZOOM 200%

IA, segredo, corrupção e aprovação usam texto e ícone.

Conteúdo e controles não podem sobrepor ou desaparecer.

MOVIMENTO REDUZIDO

TEXTURA CONTROLADA

Respeitar prefers-reduced-motion.

Nunca atrás de parágrafos, campos ou tabelas.

---

<!-- Página 11 -->

10 / CHECKPOINT
## O que já vale e o que precisa de teste

A tela de referência valida as hipóteses antes da biblioteca de componentes.

DECIDIDO

HIPÓTESES A VALIDAR

bravantus.ai como fonte oficial escudo verde como assinatura principal RPG antes de dashboard ficha como núcleo emocional

paleta semântica Cinzel + Inter dark-first linguagem da Corrupção ornamentos e textura

PRÓXIMA VALIDAÇÃO

## Quadro de referência do Character Builder

Identidade + Marca + atributos + pergunta contextual + sugestão da IA + aceitar, editar e descartar.
