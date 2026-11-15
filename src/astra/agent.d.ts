export function createAstraAgent(opts: { tools: any; phraser?: any }): {
  ask(question: string, state: any): Promise<any>;
  predict(id: string, state: any): any;
  reveal(id: string, choice: string, context: Record<string, number>, state: any): Promise<any>;
  explainControl(id: string, state: any): Promise<any>;
  explainPage(state: any): Promise<any>;
};
export function buildCandidate(scenario: any, changes: any): { candidate: any; notes: string[]; changed: string[] };
