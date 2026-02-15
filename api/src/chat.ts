import type { RecommendationItem } from './types';

interface ChatContext {
  date: string;
  region: string;
  activeItemTitle: string | null;
  activeItemLocation: string | null;
  lat: number | null;
  lng: number | null;
}

interface ChatInput {
  question: string;
  context: ChatContext;
  nearby: RecommendationItem[];
  openAiApiKey?: string;
  model?: string;
}

function fallbackAnswer(input: ChatInput): { answer: string; highlights: RecommendationItem[] } {
  const highlights = [...input.nearby].sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 4);

  const intro = input.context.activeItemTitle
    ? `You are currently around ${input.context.activeItemTitle} in ${input.context.region}.`
    : `You are currently in ${input.context.region}.`;

  const picks = highlights
    .map((item, index) => `${index + 1}. ${item.name} (${item.distanceMeters}m${item.openNow ? ', open now' : ''})`)
    .join(' ');

  const answer = `${intro} Based on your question, start with these nearby options: ${picks || 'No nearby places found yet.'}`;
  return { answer, highlights };
}

async function openAiAnswer(input: ChatInput): Promise<string | null> {
  if (!input.openAiApiKey) return null;

  const model = input.model || 'gpt-4.1-mini';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            'You are a concise travel assistant. Use the itinerary and nearby places context. Give practical next-step suggestions.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            question: input.question,
            context: input.context,
            nearby: input.nearby.slice(0, 8),
          }),
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { output_text?: string };
  const text = payload.output_text?.trim();
  return text || null;
}

export async function generateRecommendationChat(input: ChatInput): Promise<{
  answer: string;
  highlights: RecommendationItem[];
}> {
  const fallback = fallbackAnswer(input);

  try {
    const aiText = await openAiAnswer(input);
    if (!aiText) return fallback;

    return {
      answer: aiText,
      highlights: fallback.highlights,
    };
  } catch {
    return fallback;
  }
}
