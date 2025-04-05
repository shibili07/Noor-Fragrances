const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController")
const passport = require("passport")
const { adminAuth, userAuth } = require("../middlewares/auth")

router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)
router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')

})
//forget password section
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/verifyEmail",userController.loadEmailVerify)
router.post("/verifyEmail",userController.verifyEmail)
router.get("/changePassword",userController.loadChangePasswordPage)
router.post("/changePassword",userController.changePassword)
router.get("/logout",userAuth,userController.logout)

//home
router.get("/",userController.loadHomepage)
//shop page 
router.get("/shop",userAuth,userController.loadShopPage)

module.exports=router