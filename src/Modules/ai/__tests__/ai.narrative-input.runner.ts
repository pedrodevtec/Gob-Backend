import assert from "node:assert/strict";
import { assessNarrativeInput } from "../ai.narrative-input";

const brief = assessNarrativeInput({
  before_mark: "Era ferreiro.",
  motivation_and_bonds: "Quer proteger a familia.",
  mark_change: "A Marca brilha.",
});

assert.equal(brief.answeredPrompts, 3);
assert.equal(brief.needsGentleExpansion, true);
assert.match(brief.guidance, /curtas sao validas/i);

const detailed = assessNarrativeInput({
  before_mark: "Vivia em uma comunidade de artesoes e aprendeu cedo a proteger os vizinhos durante viagens perigosas.",
  motivation_and_bonds: "Deseja reencontrar a irma desaparecida e preserva a promessa de nunca abandonar quem confia nele.",
  mark_change: "A Marca cobre o antebraco e pulsa diante do perigo, lembrando que todo poder exige responsabilidade.",
});

assert.equal(detailed.answeredPrompts, 3);
assert.equal(detailed.needsGentleExpansion, false);
assert.match(detailed.guidance, /material narrativo suficiente/i);

console.log("AI narrative input tests completed.");
