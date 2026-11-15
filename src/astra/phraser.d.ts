export interface AstraPhraser {
  readonly name: string;
  readonly enabled: boolean;
  rephrase(text: string, opts?: { timeoutMs?: number }): Promise<string | null>;
  answer(question: string, context: unknown, history?: { role: 'user' | 'assistant'; content: string }[], opts?: { timeoutMs?: number }): Promise<string | null>;
}
export function createPhraser(config?: { url?: string; disabled?: boolean }): AstraPhraser | null;
