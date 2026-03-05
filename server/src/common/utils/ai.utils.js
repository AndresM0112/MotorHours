import { openai } from "../config/IA.config.js";

/**
 * Realiza una consulta a la API de OpenAI.
 * @param {string} prompt - Texto que se enviará a la API como entrada.
 * @param {object} options - Parámetros adicionales como modelo, temperatura, etc.
 * @returns {Promise<string>} - Respuesta del modelo de IA.
 */
export async function askAI(prompt, options = {}) {
  try {
    const response = await openai.createChatCompletion({
      model: process.env.AI_MODEL || "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
      top_p: parseFloat(process.env.AI_TOP_P) || 1,
      frequency_penalty: options.frequency_penalty || 0,
      presence_penalty: options.presence_penalty || 0,
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error al realizar la consulta a OpenAI: ${error.message}`);
    throw new Error("Error en la consulta a la API de IA.");
  }
}
