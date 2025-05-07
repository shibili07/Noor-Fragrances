const express = require("express")
const router = express.Router()
const multer = require("multer")
const storage = require("../helpers/multer")
const { uploadMemory } = require("../helpers/multer");

const userController = require("../controllers/user/userController")
const productController = require("../controllers/user/productController")
const cartController = require("../controllers/user/cartController")
const profileController = require("../controllers/user/profileController")
const orderController = require("../controllers/user/orderController")


const passport = require("passport")
const { adminAuth, userAuth} = require("../middlewares/auth");
const User = require("../models/userSchema");

router.get("/pageNotFound",userController.pageNotFound)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
router.get("/otp-verify",userController.loadOtpVerify)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)
router.get("/auth/google",passport.authenticate("google",{scope:['profile','email']}));



router.get('/auth/google/callback', (req, res, next) => {
    passport.authenticate('google', (err, user, info) => {
      if (err || !user) {
        const message = info?.message || 'Authentication failed';
       
        return res.redirect(`/signup?message=${encodeURIComponent(message)}`);
      }
  
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          return res.redirect(`/signup?message=${encodeURIComponent('Login failed')}`);
        }
  
        req.session.user = user._id;
        return res.redirect('/');
      });
    })(req, res, next);
  });



//login and logout 
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userAuth,userController.logout)

//forget password per 
router.get("/verifyEmail",userController.loadEmailVerify)
router.post("/verifyEmail",userController.verifyEmail)
router.get("/forgotPasswordOtpVerify",userController.loadForgotPasswordOtpVerify)
router.post("/forgotPasswordOtpVerify",userController.forgotPasswordOtpVerify)
router.post("/resendOtpForgotPass",userController.resendOtpForgotPass)

router.get("/forgotPassword",userController.loadChangePasswordPage)
router.post("/forgotPassword",userController.changePassword)


//home
router.get("/",userAuth,userController.loadHomepage)
//shop page 
router.get("/shop",userAuth,productController.loadShopPage)
router.get("/productDetails/:id",productController.productDetails)

router.get("/addToCart",userAuth,cartController.addToCart)
router.get("/productQuantity",cartController.productQuantity)

//cart page
router.get("/cart",userAuth,cartController.cart)
router.post("/cartQuantityCheck",userAuth, cartController.cartQuantityCheck);
router.delete("/deleteFromCart",userAuth,cartController.deleteFromCart)
router.get('/checkOut', userAuth, cartController.checkOut);
router.post('/apply-coupon', userAuth, cartController.applyCoupon);
router.post('/remove-coupon', userAuth, cartController.removeCoupon);
router.post('/cod', userAuth, cartController.cod);
router.post('/checkout/razorpay', userAuth, cartController.checkoutRazorpay);
router.post('/verifyPayment', userAuth, cartController.verifyPayment);
router.post('/checkout/wallet', userAuth, cartController.checkoutWallet);
router.get('/orderSuccess', userAuth, cartController.orderSuccess);
router.get('/orderFailed', userAuth, cartController.orderFailed);
router.post('/retryRazorpayPayment',userAuth,cartController.retryRazorpayPayment)
router.post('/verifyRetryPayment', userAuth, cartController.verifyRetryPayment);
router.post('/checkoutQuantity',userAuth,cartController.checkStockAvailability);
//profle
router.get("/profile",userAuth,profileController.userInfo)

router.get("/editProfile", userAuth,profileController.loadEditProfile);

router.patch("/editProfile", userAuth,uploadMemory.single("profilePicture"),profileController.editProfile);
router.patch("/changePassword/:id",userAuth,profileController.editPassword)//password change userProfile

//addresses 
router.get("/address",userAuth,profileController.loadAddressPage)

//Add || Edit || Delete  addressss 
router.get("/addAddress",userAuth,profileController.getAddaddress)
router.post("/addAddress",userAuth,profileController.AddAddress)
router.get("/set-default-address",userAuth,profileController.setDefault)
router.get("/editAddress/:id",userAuth,profileController.loadEditAddress)
router.patch("/editAddress",userAuth,profileController.editAddress)
router.delete("/deleteAddress/:id",userAuth,profileController.deleteAddress)

//change Email
router.get("/change-email",userAuth,profileController.changeEmailForm)
router.post("/change-email",userAuth,profileController.changeEmail)
router.get("/confirm-email",userAuth,profileController.confirmEmailChange)
router.get("/email-sent-confirmation",userAuth,profileController.emailSentConfirmation)



router.get("/myOrders",userAuth,orderController.myOrders)
router.get("/order-details/:id",userAuth,orderController.getOrderDetails)
router.post("/cancelOrder/:id",userAuth,orderController.cancelOrder)
//cancel order for a single product
router.post('/productCancelOrder',userAuth,orderController.productCancelOrder);
router.post("/productReturnOrder",userAuth,orderController.productReturnOrder);

//wallet 

router.get("/wallet",userAuth,profileController.loadWallet)

//wishlist 
router.get("/addToWishlist/:productId/:sku",userAuth,productController.addToWishlist)
router.get("/wishlist",userAuth,productController.loadWishlist)
router.post("/removeToWishlist",userAuth,productController.removeTOWishlist)


//referAndEarn 
router.get("/referAndEarn",userAuth,userController.referAndEarn)
module.exports=router