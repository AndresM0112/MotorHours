import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  paginationProfilesController,
  getModulesController,
  saveProfileController,
  deleteProfileController,
} from "./profiles.controller.js";

const profilesRoutes = express.Router();

// RUTAS PRIVADAS
profilesRoutes.post(
  "/pagination_profiles",
  verifyToken,
  paginationProfilesController
);

profilesRoutes.get("/get_modules", verifyToken, getModulesController);

profilesRoutes.post("/save_profile", verifyToken, saveProfileController);

profilesRoutes.put("/delete_profile", verifyToken, deleteProfileController);

export default profilesRoutes;
