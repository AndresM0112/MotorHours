import express from "express";
import { verifyToken } from "../../common/middlewares/authjwt.middleware.js";
import {
  deleteMasterTemplate,
  getMasterTemplate,
  paginationMasterTemplate,
  saveMasterTemplate,
} from "./template.controller.js";

const masterTemplateRoutes = express.Router();

masterTemplateRoutes.get("/get_templates", verifyToken, getMasterTemplate);
masterTemplateRoutes.post(
  "/pagination_templates",
  verifyToken,
  paginationMasterTemplate
);
masterTemplateRoutes.post("/save_template", verifyToken, saveMasterTemplate);
masterTemplateRoutes.put("/delete_template", verifyToken, deleteMasterTemplate);

export default masterTemplateRoutes;
