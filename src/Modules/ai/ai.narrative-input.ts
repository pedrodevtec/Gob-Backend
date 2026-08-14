export interface NarrativeInputAssessment {
  answeredPrompts: number;
  totalWords: number;
  briefPrompts: number;
  needsGentleExpansion: boolean;
  guidance: string;
}

const countWords = (value: string): number =>
  value.trim().split(/\s+/).filter(Boolean).length;

export const assessNarrativeInput = (value: unknown): NarrativeInputAssessment => {
  const responses = value && typeof value === "object" && !Array.isArray(value)
    ? Object.values(value as Record<string, unknown>)
        .filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()))
    : [];
  const wordCounts = responses.map(countWords);
  const totalWords = wordCounts.reduce((total, count) => total + count, 0);
  const briefPrompts = wordCounts.filter((count) => count < 8).length;
  const needsGentleExpansion = responses.length < 3 || totalWords < 30 || briefPrompts > 0;

  return {
    answeredPrompts: responses.length,
    totalWords,
    briefPrompts,
    needsGentleExpansion,
    guidance: needsGentleExpansion
      ? "As respostas curtas sao validas. Preserve o que foi dito, ofereca hipoteses pequenas e editaveis e use no maximo uma pergunta complementar para toda a resposta."
      : "Ha material narrativo suficiente. Organize e refine sem acrescentar fatos que o jogador nao forneceu.",
  };
};
