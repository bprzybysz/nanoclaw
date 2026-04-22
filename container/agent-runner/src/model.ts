export const MODEL_ALIASES: Record<string, string> = {
  haiku: 'claude-haiku-4-5',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
};

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

export function resolveModel(
  prompt: string,
  envDefault: string = DEFAULT_MODEL,
): { model: string; prompt: string } {
  const match = prompt.match(/^!([a-z]+)(\s+|$)/i);
  if (!match) return { model: envDefault, prompt };
  const alias = match[1].toLowerCase();
  const mapped = MODEL_ALIASES[alias];
  if (!mapped) return { model: envDefault, prompt };
  return { model: mapped, prompt: prompt.slice(match[0].length) };
}
