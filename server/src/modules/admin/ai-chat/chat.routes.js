import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  getUserTokenUsage,
  getChatHistory,
  chatWithAI,
} from "./chat.controller.js";

const chatAiRoutes = express.Router();

chatAiRoutes.post("/get_user_token_usage", verifyToken, getUserTokenUsage);
chatAiRoutes.post("/get_chat_history", verifyToken, getChatHistory);
chatAiRoutes.post("/chat-ai", chatWithAI);

export default chatAiRoutes;
