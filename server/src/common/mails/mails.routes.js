import express from "express";
import authMails from "./auth.mails.js";

const mailsRoutes = express.Router();

mailsRoutes.use("/", authMails);

export default mailsRoutes;
