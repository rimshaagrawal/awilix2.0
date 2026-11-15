export interface AstraSourceRef { id: string; label: string; href?: string; kind: string }
export interface ViewFact { label: string; aliases: string[]; purpose: string; anchors: Record<string, string>; explain: string; tryIt?: { label: string; action: any } }
export interface ControlFact { view: string; label: string; aliases: string[]; text: string; why: string }
export const SOURCES: Record<string, AstraSourceRef>;
export const VIEWS: Record<string, ViewFact>;
export const CONTROLS: Record<string, ControlFact>;
export const KNOWLEDGE: Array<{ id: string; tags: string[]; status: string; sources: string[]; text: string; detail: string }>;
export const STATIC_FACTS: Array<{ text: string; sources: string[]; views: string[] }>;
export const BOUNDARIES: Array<{ id: string; pattern: RegExp; note: string }>;
