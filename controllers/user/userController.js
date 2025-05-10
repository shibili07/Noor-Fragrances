const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Offer = require("../../models/offerSchema")
const env = require("dotenv").config()
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")
const express= require("express");
const Wallet = require("../../models/walletSchema")


const pageNotFound = async (req,res) =>{
 try {
    res.render("page-404")

 } catch (error) {
    res.redirect("/pageNotFound")
    
 }

}

const logout = (req,res)=>{
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err)
                return res.status(500).send("Error logging out");
            }
            res.redirect('/'); 
        });
    } catch (error) {
        res.redirect("/pageError")
    }
}




const loadHomepage = async (req, res) => {
  try {
    const user = req.session.user;

    // Get listed categories
    const categories = await Category.find({ isListed: true, isDeleted: false });
    const categoryIds = categories.map(cat => cat._id);

    // Get valid offers
    const now = new Date();
    const offers = await Offer.find({
      isListed: true,
      isDeleted: false,
      validFrom: { $lte: now },
      validUpto: { $gte: now }
    });

    // Get products
    let productData = await Product.find({
      isBlocked: false,
      isDeleted: false,
      category: { $in: categoryIds },
      "variants.quantity": { $gt: 0 }
    }).lean(); // .lean() allows us to modify the result

    // Apply offer price logic
    for (let product of productData) {
      const productOffer = offers.find(
        offer => offer.offerType === 'Product' && offer.applicableTo.toString() === product._id.toString()
      );
      const categoryOffer = offers.find(
        offer => offer.offerType === 'Category' && offer.applicableTo.toString() === product.category.toString()
      );
      const activeOffer = productOffer || categoryOffer;

      product.hasOffer = !!activeOffer;

      for (let variant of product.variants) {
        const basePrice = variant.salePrice || 0;

        if (activeOffer && basePrice > 0) {
          const discount = activeOffer.discountAmount;
          const discounted = basePrice - (basePrice * discount) / 100;
          variant.offerPrice = Math.round(discounted);
        } else {
          variant.offerPrice = basePrice;
        }
      }
    }

    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    productData = productData.slice(0, 6);

    const userData = await User.findById(user);

    return res.render("home", {
      user: userData,
      products: productData
    });

  } catch (error) {
    console.error("Home page is not found", error);
    res.status(500).send("Server error");
  }
};



const loadSignup = async (req,res)=>{
    try {
       
        const {message} =req.query
        const {referral} =req.query
         
        if(req.session.user){
            return res.redirect("/")
        }
        
        return res.render("signup",{message:message||"",referral:referral||""})
        
    } catch (error) {
        console.log("signup is not found");
        res.status(500).send("Server error")    
    }
}



//otp genarating function
function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}
//function for sent otp

async function sendVerificationEmail(email,otp) {
    try {
        // define transport 
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD

            }
        })
        
        //define info 
        
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`your OTP  is ${otp}`,
            html:`<b> Your OTP:${otp}</b>`,
        })

        return info.accepted.length>0

    } catch (error) {
        console.error("Error sending email",error)
        return false;
        
    }
    
}


const signup = async (req, res) => {
    try {
      console.log(req.body);
  
      const { name, phone, email, password, confirmPassword, referral } = req.body;
  
      
      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match" });
      }
  
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters, include uppercase, lowercase, and a number. No special characters allowed."
        });
      }
  
      
      const findUser = await User.findOne({ email });
      if (findUser) {
        return res.status(400).json({ success: false, message: "User with this email already exists" });
      }
  
     
      const otp = generateOtp(); 
      const emailSent = await sendVerificationEmail(email, otp);
  
      if (!emailSent) {
        return res.json({ success: false, message: "Failed to send OTP email" });
      }
  
     
      req.session.userOtp = {
        code: otp,
        expiresAt: Date.now() + 60 * 1000 
      };
  
      req.session.userData = { name, phone, email, password, referral };

      console.log("OTP Sent:", otp);
  
      return res.status(200).json({ success: true, message: "OTP Sent Successfully" });
  
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).redirect("/pageNotFound");
    }
  };

  


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error('Error hashing password:', error);
        throw error; 
    }
};


const loadOtpVerify = async(req,res)=>{
    try {
        return res.render("otp-verify")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const verifyOtp = async (req, res) => {
    try {
      const { otp } = req.body;
      const { name, phone, email, password, referral } = req.session.userData;
  
      const userOtp = req.session.userOtp; 
  
     
      if (!userOtp || Date.now() > userOtp.expiresAt) {
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
      }
  
      if (otp !== userOtp.code) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
  
      // OTP is valid, create user
      const passwordHash = await securePassword(password);
      const newUser = new User({
        name,
        email,
        phone,
        password: passwordHash,
      });
      await newUser.save();
  
      req.session.user = newUser._id;
  
      // Referral logic
      const referralUser = await User.findOne({ referralCode: referral });
      const userId = newUser._id;
  
      if (referralUser) {
        // Credit Rs. 1000 to the referrer
        let referrerWallet = await Wallet.findOne({ userId: referralUser._id });
        if (!referrerWallet) {
          referrerWallet = new Wallet({
            userId: referralUser._id,
            balance: 0,
            transactions: [],
          });
        }
        referrerWallet.transactions.push({
          transactionId: Math.random().toString(36).substr(2, 9),
          amount: 1000,
          type: "Credit",
          method: "ReferralBonus",
          status: "Completed",
          date: Date.now(),
          description: "Signup bonus credited",
        });
        referrerWallet.balance += 1000;
        await referrerWallet.save();
  
        referralUser.redeemedUsers.push(userId);
        await referralUser.save();
  
        // Credit Rs. 500 to the new user
        const newUserWallet = new Wallet({
          userId,
          balance: 500,
          transactions: [{
            transactionId: Math.random().toString(36).substr(2, 9),
            amount: 500,
            type: "Credit",
            method: "SignupBonus",
            status: "Completed",
            date: Date.now(),
            description: "Signup bonus credited",
          }],
        });
        await newUserWallet.save();
      } else {
        // Create empty wallet for non-referred users
        const wallet = new Wallet({
          userId,
          balance: 0,
          transactions: [],
        });
        await wallet.save();
      }
  
      // Cleanup OTP from session
      delete req.session.userOtp;
     
  
      return res.status(200).json({ success: true, redirectUrl: "/login" });
  
    } catch (error) {
      console.error("Error verifying OTP", error);
      res.status(500).json({ success: false, message: "An error occurred during OTP verification" });
    }
  };
  


//resend  otp part 
const resendOtp = async(req,res)=>{
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = {
            code: otp,
            expiresAt: Date.now() + 60 * 1000 // 60 seconds from now
          };
        const emailSent =  await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
            
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"})
        }

    } catch (error) {
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error. Please try again"})
        
    }
} 



const loadLogin = async (req,res) =>{
    try {

        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
        

    } catch (error) {
        
        res.redirect('/pageNotFound')
    }
}



const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        
        const findUser = await User.findOne({ isAdmin: false, email: email });

        if (!findUser) {
            return res.status(400).json({ success: false, message: "User Does not Exist!" });
        }

        if (findUser.isBlocked) {
            return res.status(400).json({ success: false, message: "User is blocked by admin!" });
        }

        
        const passwordMatch = await bcrypt.compare(password, findUser.password);

        if (!passwordMatch) {
            return res.status(400).json({ success: false, message: "Incorrect Password!" });
        }

        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regeneration error', err);
                return res.status(500).json({ success: false, message: "Internal Server Error" });
            }

            req.session.user = findUser._id;
            req.session.name = findUser.name;

            
            return res.status(200).json({ success: true, message: "Login Successful" });
        });

    } catch (error) {
        console.error('Login error', error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};








const loadEmailVerify = async (req,res)=>{
    try {
        return res.render("f-pass-email")//forggot password email verify page 
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyEmail = async(req,res)=>{
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email,isBlocked:false})
        if(!email){
          return res.status(400).json({success:false,message:"Email Verify Failed!"})
        }
        if(!findUser){
            return res.status(400).json({success:false,message:"User Does Not Exist!"})
        }
        req.session.emailForget = email
       
        const otp = generateOtp(); 
        req.session.otpForgot = otp
        //sent otp through email
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            return res.status(200).json({success:true,message:"Email Verified Successfully, An Otp Sent Your Email!"})
        }else{
            return res.status(400).json({success:false,message:"An error occurred While Verifying Email"})
        }
        

    } catch (error) {
        console.error("verify email error",error);
        res.redirect('/pageNotFound')
        
    }
}

const loadForgotPasswordOtpVerify = async (req,res)=>{
    try{
        return res.render("forgetPass-verifyOtp")

    }catch(error){
        console.log(error);
    
    }
}


const forgotPasswordOtpVerify = async (req,res)=>{
    try{
        const {otp}=req.body
        
        if(!otp){
            return res.status(400).json({success:false,message:"Invalid Otp!"})
        }

        if(req.session.emailForget&&req.session.otpForgot){
            if(otp===req.session.otpForgot){
                return res.status(200).json({success:true,message:"Otp Verified Successfully",redirectUrl:"/forgotPassword"})
            }else{
                return res.status(400).json({success:false,message:"Invalid Otp!"})
            }
        }

    }catch{
        return res.status(500).json({success:false,message:"Internal Server Error"})

    }
}

const resendOtpForgotPass = async(req,res)=>{
    try {
        const email = req.session.emailForget;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        req.session.otpForgot=null
        const otp = generateOtp();
        req.session.otpForgot = otp
        const emailSent =  await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
            
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"})
        }

    } catch (error) {
        console.error("Error resending OTP",error)
        res.status(500).json({success:false,message:"Internal Server Error. Please try again"})
        
    }
}





const loadChangePasswordPage = async (req,res)=>{
    try{
        return res.render("changePassword-forgot")
    }catch(error){
        
        res.redirect("/pageNotFound")

    }
}

const changePassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        console.log(req.body);

        if (!password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "Both password fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^\s]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long, contain uppercase and lowercase letters, a number, and no spaces",
            });
        }

        const email = req.session.emailForget;
        if (!email) {
            return res.status(400).json({ success: false, message: "Session expired or email not found" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await User.findOneAndUpdate(
            { email },
            { $set: { password: hashedPassword } },
            { new: true }
        );

        if (updatedUser) {
            return res.status(200).json({ success: true, message: "Password updated successfully!" });
        } else {
            return res.status(404).json({ success: false, message: "User not found" });
        }

    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const emailSentConfirmation = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.redirect('/profile');
    }
    return res.render('emailSentConfirmation', { newEmail: email });
  } catch (error) {
    return res.redirect('/profile');
  }
};



//refer and earn

const referAndEarn = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }
    const userData = await User.findById(userId);
    const myref = userData.redeemedUsers;

    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of referrals per page
    const skip = (page - 1) * limit;

    const totalReferrals = myref.length;
    const totalPages = Math.ceil(totalReferrals / limit);

    // Get only the referrals for the current page
    const paginatedRefIds = myref.slice(skip, skip + limit);
    const myreferrals = await User.find({ _id: { $in: paginatedRefIds } });

    return res.render("referAndEarn", {
      user: userData,
      myreferrals,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageNotFound");
  }
};


module.exports={
    pageNotFound,
    logout,
    loadHomepage,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    loadEmailVerify,
    verifyEmail,
    loadChangePasswordPage,
    changePassword,
    loadOtpVerify,
    emailSentConfirmation,
    referAndEarn,
    loadForgotPasswordOtpVerify,
    forgotPasswordOtpVerify,
    resendOtpForgotPass
}