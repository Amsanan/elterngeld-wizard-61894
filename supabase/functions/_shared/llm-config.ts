// Central LLM configuration for all document extractors
export const LLM_CONFIG = {
  // Model to use for extraction (using paid tier to avoid rate limits)
  model: "mistralai/mistral-small-24b-instruct-2501:free",

  // Retry configuration
  maxRetries: 4,
  baseDelayMs: 1000, // Base delay in milliseconds (will be exponentially increased)

  // API settings
  temperature: 0.1,

  // OpenRouter API endpoint
  apiEndpoint: "https://openrouter.ai/api/v1/chat/completions",
};

export function getRetryDelay(attempt: number): number {
  return LLM_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
}
