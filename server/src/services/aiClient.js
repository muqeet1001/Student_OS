import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * A minimal Anthropic Messages client.
 *
 * Hand-rolled rather than pulled from the SDK because this needs exactly one
 * call shape, has to point at a gateway rather than the vendor host, and
 * must degrade to "no AI" without taking a request down with it.
 *
 * Everything here is best-effort by design. Every caller has a deterministic
 * answer already computed; the model adds interpretation on top. If it is
 * slow, rate-limited, misconfigured or down, the caller keeps its own answer
 * and says the narrative is unavailable. Nothing user-facing depends on a
 * model responding.
 */

const TIMEOUT_MS = 30_000;

/** Retried once. A second failure is a real outage, not a blip. */
const ATTEMPTS = 2;

export function aiStatus() {
  if (!config.ai.apiKey) {
    return {
      available: false,
      reason: 'AI_API_KEY is not set, so written insight is unavailable. Every number on this page is computed without it.',
    };
  }

  return { available: true, reason: null, model: config.ai.model };
}

/**
 * Sends one message and returns the text, or null.
 *
 * Never throws: a thrown error here would turn "the narrative is missing"
 * into "the page is broken", and the page is worth more than the narrative.
 *
 * @param {object} input
 * @param {string} input.system System prompt.
 * @param {string} input.prompt User message.
 * @param {number} [input.maxTokens]
 * @returns {Promise<{text: string|null, error: string|null}>}
 */
export async function askModel({ system, prompt, maxTokens = 1500 }) {
  const status = aiStatus();
  if (!status.available) return { text: null, error: status.reason };

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${config.ai.baseUrl}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          // The gateway takes a bearer token; a direct Anthropic host would
          // want x-api-key plus anthropic-version. Both are sent so the same
          // config works against either.
          Authorization: `Bearer ${config.ai.apiKey}`,
          'x-api-key': config.ai.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ai.model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 300);

        // 4xx other than rate limiting will fail identically on a retry —
        // a bad key or an unknown model does not fix itself in two seconds.
        const worthRetrying = response.status === 429 || response.status >= 500;
        if (!worthRetrying || attempt === ATTEMPTS) {
          logger.warn(`AI gateway ${response.status}: ${detail}`);
          return { text: null, error: `AI gateway returned ${response.status}.` };
        }
        continue;
      }

      const body = await response.json();

      // Anthropic returns content as an array of blocks; only text blocks
      // are of interest here.
      const text = (body.content ?? [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      if (!text) return { text: null, error: 'The model returned no text.' };
      return { text, error: null };
    } catch (error) {
      const timedOut = error.name === 'AbortError';
      if (attempt === ATTEMPTS) {
        logger.warn(`AI request failed: ${error.message}`);
        return {
          text: null,
          error: timedOut ? 'The AI request timed out.' : `AI request failed: ${error.message}`,
        };
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return { text: null, error: 'AI request failed.' };
}

/**
 * Asks for JSON and parses it.
 *
 * Models wrap JSON in prose or fences however firmly you ask them not to, so
 * the first balanced object in the response is extracted rather than trusting
 * the whole body to parse. A parse failure is reported, never guessed at.
 */
export async function askModelForJson({ system, prompt, maxTokens }) {
  const { text, error } = await askModel({ system, prompt, maxTokens });
  if (!text) return { data: null, error };

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    return { data: null, error: 'The model did not return JSON.' };
  }

  try {
    return { data: JSON.parse(text.slice(start, end + 1)), error: null };
  } catch {
    return { data: null, error: 'The model returned malformed JSON.' };
  }
}
