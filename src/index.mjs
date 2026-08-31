/*
 * KOSIF Audit Pro — نقطة الدخول الموحّدة
 * تعمل في Node والمتصفح دون خطوة بناء.
 */

export * from './palette.mjs';
export * from './core/trial-balance.mjs';
export * from './core/statements.mjs';
export * from './core/analysis.mjs';
export * from './core/format.mjs';
export * from './core/dataset.mjs';
export * from './standards/catalog.mjs';
export * from './standards/linkage.mjs';
export { ROUNDS, GATE, evaluateProgramme, PROGRAMME_VERSION } from './audit/rounds.mjs';
export * from './audit/engagement.mjs';
export { REVIEWERS, runBoard, BOARD_VERSION } from './reviewer/board.mjs';
export { PROVIDERS, requestNarrative, buildPrompt, verifyNarrative, LLM_VERSION } from './reviewer/llm.mjs';

export const APP = Object.freeze({
  name: 'KOSIF Audit Pro',
  version: '1.0.0',
  buildId: '2026.08.31-kosif-audit-pro',
  tagline: 'مراجعة وتحليل مالي بجولات محكومة ومعايير حيّة'
});
