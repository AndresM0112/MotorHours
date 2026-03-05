import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";

// Cargar variables de entorno desde el archivo .env
dotenv.config();

// Validar que la clave API esté presente
if (!process.env.OPENAI_API_KEY) {
  console.error("Error: La clave de la API de OpenAI no está configurada.");
}

// Configuración de la API de OpenAI
const openAIConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

// Instancia del cliente de OpenAI
const openai = new OpenAIApi(openAIConfig);

export { openai };
