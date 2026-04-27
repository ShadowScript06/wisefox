import express from "express";
import { authController } from "./auth.controllers";
import { authMiddleware } from "../../middlewares/auth";
import { validate } from "../../middlewares/inputvalidator";
import { emailSignInSchema } from "../../config/validations/auth/emailSignInSchema";
import { emailSignupSchema } from "../../config/validations/auth/emailSignupSchema";


const router=express.Router();

router.get('/google',authController.startGoogleLogin);

router.get('/google/callback',authController.googleCallback);


router.post('/email/signUp',validate(emailSignupSchema),authController.emailSignUp);

router.post('/email/signIn',validate(emailSignInSchema),authController.emailSignIn);

router.get('/user', authMiddleware, authController.getUser);

router.post('/logout',authController.logout);


export default router;



