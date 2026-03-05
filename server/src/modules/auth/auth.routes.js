import express from "express";
import { verifyToken } from "../../common/middlewares/authjwt.middleware.js";
import {
  loginController,
  registerUser,
  resendOtpCode,
  verifyOtpCode,
  getSettlementController,
  updateAccountController,
  updatePasswordController,
  getWindowsByProfileController,
  validateCodePasswordController,
  restorePasswordController,
} from "./auth.controller.js";

const authRoutes = express.Router();

authRoutes.post("/login", loginController);

authRoutes.post("/register", registerUser);

authRoutes.post("/resend-otp", resendOtpCode);

authRoutes.post("/verify-otp", verifyOtpCode);

authRoutes.put("/update_password", updatePasswordController);

authRoutes.get("/get_basic_information", verifyToken, getSettlementController);

authRoutes.get(
  "/get_windows_by_profile",
  verifyToken,
  getWindowsByProfileController
);

authRoutes.put("/update_account", verifyToken, updateAccountController);

authRoutes.post("/validate_code_password", validateCodePasswordController);

authRoutes.post("/restore_password", restorePasswordController);

export default authRoutes;
