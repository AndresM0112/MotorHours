import express from "express";
import { verifyToken } from "../../../common/middlewares/authjwt.middleware.js";
import {
  getNotificationCount,
  listNotifications,
  markAllAsRead,
  markAsRead,
} from "./notifications.controller.js";

const notificationsRoutes = express.Router();

notificationsRoutes.get(
  "/get_notification_count",
  verifyToken,
  getNotificationCount
);

notificationsRoutes.post(
  "/pagination_notifications",
  verifyToken,
  listNotifications
);

notificationsRoutes.post("/markAsRead", verifyToken, markAllAsRead);

notificationsRoutes.post("/:id/markAsRead", verifyToken, markAsRead);

export default notificationsRoutes;
