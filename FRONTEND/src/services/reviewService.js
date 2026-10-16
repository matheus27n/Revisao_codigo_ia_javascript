import { API_BASE_URL } from "./api";

export class ReviewRequestError extends Error {
  constructor(message, { type, status = null, apiMessage = null, cause } = {}) {
    super(message, { cause });
    this.name = "ReviewRequestError";
    this.type = type;
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

export async function submitReview({ code, filename, environment, mode, maxContexts = 3 }) {
  const payload = { code, filename, environment, mode };
  if (mode === "hybrid") payload.maxContexts = maxContexts;

  let response;
  try {
    response = await fetch(`${API_BASE_URL.replace(/\/+$/, "")}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    throw new ReviewRequestError("Não foi possível conectar ao backend. Verifique se ele está em execução e tente novamente.", { type: "network", cause });
  }

  let result;
  try {
    result = await response.json();
  } catch (cause) {
    throw new ReviewRequestError("Não foi possível ler a resposta do backend. Tente novamente.", {
      type: response.ok ? "response" : "http", status: response.status, cause,
    });
  }

  if (!response.ok) {
    const message = typeof result?.message === "string"
      ? result.message
      : "Não foi possível executar a análise.";
    throw new ReviewRequestError(message, { type: "http", status: response.status, apiMessage: result?.message ?? null });
  }

  return result;
}
