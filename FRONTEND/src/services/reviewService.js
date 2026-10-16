import { API_BASE_URL } from "./api";

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
  } catch {
    throw new Error("Não foi possível conectar ao backend. Verifique se ele está em execução e tente novamente.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`O backend retornou uma resposta que não é JSON válido (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = typeof result?.message === "string"
      ? result.message
      : "Não foi possível executar a análise.";
    throw new Error(`${message} (HTTP ${response.status})`);
  }

  return result;
}
