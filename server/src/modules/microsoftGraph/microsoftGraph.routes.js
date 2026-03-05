import express from "express";
import {
  getSitesDrive,
  getUserDrive,
  getUnitsDrive,
  getFoldersDrive,
  PutStorageSite,
} from "./microsoftGraph.controller.js";

const microsoftGraphRoutes = express.Router();

microsoftGraphRoutes.get("/get_sites_drive", getSitesDrive);
microsoftGraphRoutes.get("/get_user_drive", getUserDrive);
microsoftGraphRoutes.get("/get_units_drive", getUnitsDrive);
microsoftGraphRoutes.get("/get_folders_drive", getFoldersDrive);
microsoftGraphRoutes.put("/update_storage_site", PutStorageSite);

export default microsoftGraphRoutes;
