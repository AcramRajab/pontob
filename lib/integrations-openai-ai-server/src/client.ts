import OpenAI from "openai";

// Lazily create the OpenAI client so the server can boot without the AI
// integration configured. The error is only raised when an AI feature is
// actually used (at request time), not at import/startup.
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (
    !process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
    !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
  ) {
    throw new Error(
      "Recursos de IA indisponíveis: configure AI_INTEGRATIONS_OPENAI_API_KEY e AI_INTEGRATIONS_OPENAI_BASE_URL.",
    );
  }
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _client;
}

export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
