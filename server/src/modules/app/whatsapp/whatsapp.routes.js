import express from "express";
// import { receiveWhatsappResponseTickets } from "./whatsapp.controller.js";
import { sendWhatsAppMessage } from "../../../common/services/whatsappService.js";

const whatsappRoutes = express.Router();

whatsappRoutes.post("/webhook", sendWhatsAppMessage);

export default whatsappRoutes;
