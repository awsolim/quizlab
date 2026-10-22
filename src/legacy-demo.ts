import type { Bank, Question, Store } from './core';
import signatures from './legacy-demo-signatures.json';

// Only exact copies of the former built-in demo are retired. User edits survive.
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
    : item);
}
function normalizedQuestion(q: Question): Question {
  return q.choices ? { ...q, choices: [...q.choices].sort((a, b) => a.id.localeCompare(b.id)) } : q;
}
async function fingerprint(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function retireLegacyDemo(store: Store): Promise<Store> {
  const bankMatches = await Promise.all(store.banks.map(async bank => {
    if (bank.title !== signatures.title) return false;
    const { libraryId: _libraryId, ...content } = bank;
    const normalized: Bank = { ...content, questions: content.questions.map(normalizedQuestion).sort((a, b) => a.id.localeCompare(b.id)) };
    return await fingerprint(normalized) === signatures.bank;
  }));
  const questionHashes: Record<string, string> = signatures.questions;
  const attemptMatches = await Promise.all(store.attempts.map(async attempt => {
    if (attempt.title !== signatures.title || !attempt.questions.length) return false;
    return (await Promise.all(attempt.questions.map(async q =>
      Object.hasOwn(questionHashes, q.id) && await fingerprint(normalizedQuestion(q)) === questionHashes[q.id],
    ))).every(Boolean);
  }));
  if (!bankMatches.some(Boolean) && !attemptMatches.some(Boolean)) return store;
  return {
    banks: store.banks.filter((_, index) => !bankMatches[index]),
    attempts: store.attempts.filter((_, index) => !attemptMatches[index]),
  };
}
