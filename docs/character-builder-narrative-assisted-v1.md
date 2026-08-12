# Character Builder narrative-assisted-v1

`narrative-assisted-v1` e a configuracao ativa para novas campanhas. `pilot-v1` permanece publicada para retomar personagens existentes sem alterar silenciosamente o contrato original.

## Fluxo

1. O jogador responde tres perguntas narrativas amplas.
2. A IA pode interpretar campos estruturados, sem aplicar alteracoes.
3. O jogador edita e confirma identidade, motivacoes e Marca.
4. A preferencia de jogo orienta uma proposta mecanica opcional.
5. O backend valida mecanica, contexto confirmado e submissao.
6. O Mestre aprova ou solicita ajustes.

Perguntas do Episodio 1 sao opcionais nesta versao. Respostas antigas continuam preservadas.

## Persistencia

- `Character.builderConfigVersion`: versao imutavel usada pelo personagem.
- `narrativeResponses`: respostas originais do jogador.
- `confirmedNarrativeContext`: blocos e campos confirmados.
- `playStylePreference`: intencao de contribuicao nas cenas.
- `PlayerAiSuggestion`: sugestao, decisao, prompt, modelo, contexto e telemetria.
- `CharacterSubmissionSnapshot`: versao do Builder e conteudo enviado ao Mestre.

## IA

- Sugestoes narrativas usam apenas contexto autorizado do jogador.
- A proposta mecanica usa apenas narrativa confirmada, preferencia e catalogos oficiais.
- Nenhuma resposta da IA altera a ficha automaticamente.
- Falhas da IA nao bloqueiam o preenchimento manual.
