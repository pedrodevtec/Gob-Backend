import assert from "node:assert/strict";
import { CharacterCardArtService } from "../characterCardArt.service";

const keepsConfirmedConcept = CharacterCardArtService.buildBriefing({
  concept: "Uma guardia das ruinas que protege viajantes marcados.",
});
assert.equal(keepsConfirmedConcept, "Uma guardia das ruinas que protege viajantes marcados.");

const joinsMotivationWithoutInventing = CharacterCardArtService.buildBriefing({
  concept: "Um ferreiro que sobreviveu ao ataque.",
  motivation: "Busca reunir sua familia.",
});
assert.equal(
  joinsMotivationWithoutInventing,
  "Um ferreiro que sobreviveu ao ataque. Busca reunir sua familia."
);

const longBriefing = CharacterCardArtService.buildBriefing({
  concept: "Guardiao ".repeat(40),
});
assert.ok(longBriefing.length <= 220);
assert.ok(longBriefing.endsWith("..."));

const fallback = CharacterCardArtService.buildBriefing({});
assert.equal(fallback, "Guardiao marcado por uma historia que ainda sera contada.");


const visualPrompt = CharacterCardArtService.buildVisualPrompt(
  {
    name: "Ayla",
    concept: "Guardia das ruinas",
    origin: "Vila da fronteira",
    appearance: "Capa terracota",
    archetypeName: "Guardia",
    markLocation: "Braco",
    markAppearance: "Linhas douradas",
    markReaction: "Brilha ao proteger alguem",
    positiveTrait: "Coragem",
    negativeTrait: "Culpa",
    equipmentSummary: "Espada e escudo",
  },
  "PLAYABLE_CARD"
);
assert.match(visualPrompt, /papel marfim/i);
assert.match(visualPrompt, /verde-salvia/i);
assert.match(visualPrompt, /28 por cento inferiores/i);
assert.match(visualPrompt, /nao incluir[\s\S]*palavras, letras, numeros/i);
assert.ok(!visualPrompt.includes("{{"));

console.log("character card art tests passed");
