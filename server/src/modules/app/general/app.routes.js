import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  getMenuController,
  getProfilesController,
  verifyTokenController,
  getUserPermissionsController,
  getRules,
  getModules,
  saveRules,
} from "./app.controller.js";

const appRoutes = express.Router();

appRoutes.get("/get_menu", verifyToken, getMenuController);

appRoutes.get("/get_profiles", verifyToken, getProfilesController);

appRoutes.get("/verify_token", verifyToken, verifyTokenController);

appRoutes.get(
  "/get_permissions_user",
  verifyToken,
  getUserPermissionsController
);

appRoutes.get("/get_rules", verifyToken, getRules);
appRoutes.put("/update_rules", verifyToken, saveRules);
appRoutes.get("/get_modules", verifyToken, getModules);

export default appRoutes;
