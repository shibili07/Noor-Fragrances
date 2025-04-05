const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")

const env = require("dotenv").config()
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt")
const express= require("express");

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
                console.log(err);
                return res.status(500).send("Error logging out");
            }
            res.redirect('/'); 
        });
    } catch (error) {
        res.redirect("/pageError")
    }
}


const loadHomepage = async (req,res) =>{
    try {
        // in this time session il udavuka nammal login cheythappol ulla user de objectid aan  store aav
        const user = req.session.user;
        const name = req.session.name;
        console.log(name);
        const category = await Category.find({isListed:true})

        let productData = await Product.find({
            isBlocked:false,
            category:{$in:category.map(category=>category._id)},
            quantity:{$gt:0}, 
        })
        productData.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
        productData = productData.slice(0,4)
        
        if(user){
            const userData = await User.find({_id:user._id})
            
            
                return res.render("home",{
                user:userData,
                name:name,
                products:productData
                
                })
        }else{
            res.render("home",{products:productData})
        }

       
    } catch (error) {
        console.log("home page is not found",error);
        res.status(500).send("Server error") //pass to backend
        
    }

}

const loadSignup = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render("signup")
        }else{
            return res.redirect("/")
        }
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
const signup = async (req,res)=>{
    try{
        
        const {name,phone,email,password,confirmPassword} = req.body;
        if(password !== confirmPassword){
            return res.render("signup",{message:"Password do not match"})
        }
        
        const findUser= await User.findOne({email})
        if(findUser){ 
            return res.render("signup",{message:"User with this email already exists"})
        }
        // genarate otp
        const otp = generateOtp(); 
        //sent otp through email
        
        
        const emailSent = await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json('email-error')        
        }
        req.session.userOtp = otp;
        req.session.userData = {name,phone,email,password}

        res.render("otp-verify")
        console.log("OTP Sent",otp);

    }catch (error){
        console.error("signup error",error);
        res.redirect("/pageNotFound")

    } 
}

const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
}

const verifyOtp = async(req,res)=>{
    try {
        const {otp} = req.body;
        if(otp===req.session.userOtp){ // check otp
            const user = req.session.userData
            // hash the password
            const passwordHash = await securePassword(user.password)
            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
            })
            await saveUserData.save();
            req.session.user = saveUserData._id;  // user id for authorisation
            res.json({success:true,redirectUrl:"/login"})

        }else if(otp===req.session.emailOtp){

            res.json({success:true,redirectUrl:"/changePassword"})

        }else{
                res.status(400).json({success:false,message:"Invalid OTP, please try again"})
        }
        
        
    } catch (error) {
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}

//resend  otp part 
const resendOtp = async(req,res)=>{
    try {
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
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
const login = async(req,res)=>{
    try {
        const {email,password}=req.body
        const findUser = await User.findOne({isAdmin:0,email:email});
        if(!findUser){
            return res.render("login",{message:"User not found"})

        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
             return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user = findUser._id;
        req.session.name = findUser.name
        res.redirect("/")

    } catch (error) {
        console.error('login error',error)
        res.render("login",{message:"login failed. Please try later"})
        
    }

}

const loadEmailVerify = async (req,res)=>{
    try {
        return res.render("f-pass-email")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyEmail = async(req,res)=>{
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email:email})
        if(!email){
            res.render("f-pass-email",{message:"Please Provide Email"})
        }
        if(!findUser){
            res.render("f-pass-email",{message:"User does not exist"})
        }
        const otp = generateOtp(); 
       
        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.json('email-error')  
        }
        req.session.emailOtp = otp 
        req.session.emailData = email
        console.log(email)
        res.render("otp-verify")
        console.log("verify email",otp);

        

    } catch (error) {
        console.error("verify email error",error);
        res.redirect('/pageNotFound')
        
    }
}




const loadChangePasswordPage = async (req,res)=>{
    try{
        return res.render("changePassword")
    }catch(error){
        
        res.redirect("/pageNotFound")

    }
}

const changePassword = async(req,res)=>{
    try {
        const {password,confirmPassword} = req.body
        console.log(password)

        if (!password || !confirmPassword) {
            return res.status(400).json({ message: "Both password fields are required" });
        }
        if(password !== confirmPassword){
            return res.status(400).json({ message: "Passwords do not match" });
        }
        const email = req.session.emailData
        
        if(!email){
            return res.status(400).json({message:"Session expired or email not found"});
        }
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password,saltRounds);

        // update the password
        const updatedUser = await User.findOneAndUpdate(
            {email},
            {$set:{password:hashedPassword}},
            {new:true}
        )

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        return res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ message: "Internal Server Error" });
        
    }

}

const loadShopPage = async (req, res) => {
  try {
    
    const userId = req.session.user;
    
   
    let userData = null;
    if (userId) {
      userData = await User.findOne({_id: userId});
    }
    
 
    const category = await Category.find({isListed: true});
    const categoryIds = category.map(category => category._id.toString());
    
    // Pagination variables
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    
    // Get products - fixed the variable declaration (remove 'const' from reassignment)
    let products = await Product.find({
      isBlocked: false,
      category: {$in: categoryIds},
      quantity: {$gt: 0},
    }).sort({createdAt: -1}).skip(skip).limit(limit);
    
    // Count total products for pagination
    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: {$in: categoryIds},
      quantity: {$gt: 0}
    });
    
    const totalPages = Math.ceil(totalProducts / limit);
    const categoriesWithIds = category.map(category => ({
      _id: category._id, 
      name: category.name
    }));
      
    res.render("shop", {
      user: userData,
      products: products,
      category: categoriesWithIds,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages
    });

  } catch (error) {
    console.log("Error loading shop page:", error);
    res.status(500).send("Server error");
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
    loadShopPage
    
}