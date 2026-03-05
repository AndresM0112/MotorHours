import {
  generateIntentPrompt,
  responseFormatterPrompt,
  fallbackPrompt,
} from "./utils/prompts.js";

import { openai } from "../../../common/configs/ai.config.js";
import {
  getConnection,
  releaseConnection,
  executeQuery,
} from "../../../common/configs/db.config.js";

const saveChatMessage = async (
  { userId, content, type, tokens },
  connection
) => {
  return true;
  // try {
  //   const sql = `
  //     INSERT INTO tbl_chat_ai (usu_id, cha_type, cha_content, cha_tokens)
  //     VALUES (?, ?, ?, ?)
  //   `;
  //   await executeQuery(sql, [userId, type, content, tokens], connection);
  // } catch (error) {
  //   console.error("Error en saveChatMessage:", error);
  //   throw error;
  // }
};

export const getUserTokenUsage = async (req, res, next) => {
  const { userId } = req.params;
  let connection = null;

  try {
    connection = await getConnection();
    const totalTokens = await executeQuery(
      `SELECT SUM(cha_tokens) AS totalTokens  FROM tbl_chat_ai WHERE usu_id = ?`,
      [userId],
      connection
    );
    res.json({ userId, totalTokens });
  } catch (error) {
    console.error("Error en getUserTokenUsageController:", error);
    next(error);
  } finally {
    releaseConnection(connection);
  }
};

export const getChatHistory = async (req, res, next) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  let connection = null;

  try {
    connection = await getConnection();
    const history = await executeQuery(
      `SELECT * FROM tbl_chat_ai WHERE usu_id = ?`,
      [userId],
      connection
    );
    res.json({ userId, history });
  } catch (error) {
    console.error("Error en getChatHistoryController:", error);
    next(error);
  } finally {
    releaseConnection(connection);
  }
};

export const chatWithAI = async (req, res, next) => {
  const { userId, userMessage } = req.body;
  let connection = null;

  try {
    console.log("Conectando a la base de datos...");
    connection = await getConnection();
    console.log("Conexión establecida.");

    // Guardar mensaje del usuario
    await saveChatMessage(
      { userId, content: userMessage, type: "user", tokens: 0 },
      connection
    );

    // Crear prompt dinámico con esquema parcial
    const dynamicPrompt = generateIntentPrompt(userMessage);

    // return res.json({ dynamicPrompt });

    const initialPrompt = [
      { role: "system", content: dynamicPrompt },
      { role: "user", content: userMessage },
    ];

    // Llamada a OpenAI para detectar intención
    const aiIntent = await openai.createChatCompletion({
      model: "gpt-4",
      messages: initialPrompt,
      temperature: 0,
    });

    const gptResponse = aiIntent.data.choices[0].message.content.trim();
    const tokensUsedIntent = aiIntent.data.usage.total_tokens;

    console.log("Consulta generada por GPT:", gptResponse);
    console.log("Tokens de intención:", tokensUsedIntent);

    const safeSqlRegex = /^select[\s\S]+from[\s\S]+$/i;

    if (safeSqlRegex.test(gptResponse)) {
      // Ejecutar consulta segura
      const result = await executeQuery(gptResponse, [], connection);

      const formatPromptMessages = [
        { role: "system", content: responseFormatterPrompt },
        {
          role: "user",
          content: `Consulta original del usuario: ${userMessage}`,
        },
        {
          role: "assistant",
          content: `Resultados obtenidos: ${JSON.stringify(result)}`,
        },
      ];

      const finalAnswer = await openai.createChatCompletion({
        model: "gpt-4",
        messages: formatPromptMessages,
        temperature: 0.7,
      });

      const finalText = finalAnswer.data.choices[0].message.content.trim();
      const tokensUsedFinal = finalAnswer.data.usage.total_tokens;
      const totalTokens = tokensUsedIntent + tokensUsedFinal;

      // Guardar respuesta final
      await saveChatMessage(
        {
          userId,
          content: finalText,
          type: "assistant",
          tokens: tokensUsedFinal,
        },
        connection
      );

      return res.json({
        reply: finalText,
        totalTokens,
      });
    } else {
      // Fallback: consulta no segura
      const fallbackMessages = [
        { role: "system", content: fallbackPrompt },
        { role: "user", content: userMessage },
      ];

      const fallbackResponse = await openai.createChatCompletion({
        model: "gpt-4",
        messages: fallbackMessages,
        temperature: 0.5,
      });

      const fallbackText =
        fallbackResponse.data.choices[0].message.content.trim();
      const tokensUsedFallback = fallbackResponse.data.usage.total_tokens;
      const totalTokens = tokensUsedIntent + tokensUsedFallback;

      // Guardar respuesta fallback
      await saveChatMessage(
        {
          userId,
          content: fallbackText,
          type: "assistant",
          tokens: tokensUsedFallback,
        },
        connection
      );

      return res.json({
        reply: fallbackText,
        totalTokens,
      });
    }
  } catch (err) {
    next(err);
  } finally {
    releaseConnection(connection);
  }
};
