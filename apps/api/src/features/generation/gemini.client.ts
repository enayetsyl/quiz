import type { GenerationResponsePayload } from "./generation.schema";

export type GeminiGenerationInput = {
  pageId: string;
  pageNumber: number;
  language: "bn" | "en" | null;
};

export class GeminiClient {
  async generateQuestions(input: GeminiGenerationInput): Promise<GenerationResponsePayload> {
    const language = input.language ?? "en";
    const difficulties: ("easy" | "medium" | "hard")[] = ["easy", "medium", "hard"];

    const questions = difficulties.map((difficulty, index) => ({
      lineIndex: index,
      stem: `Draft question ${index + 1} for page ${input.pageNumber}`,
      difficulty,
      explanation: `Explain answer ${index + 1}.`,
      correctOption: "a" as const,
      options: [
        { key: "a" as const, text: `Correct option ${index + 1}` },
        { key: "b" as const, text: `Option B ${index + 1}` },
        { key: "c" as const, text: `Option C ${index + 1}` },
        { key: "d" as const, text: `Option D ${index + 1}` },
      ],
    }));

    return {
      questions,
      language,
      tokensIn: 0,
      tokensOut: 0,
    };
  }
}

export const geminiClient = new GeminiClient();
