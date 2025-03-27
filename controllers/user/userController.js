const User = require("../../models/userSchema")
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
const loadHomepage = async (req,res) =>{
    try {
        const user = req.session.user;
        if(user){
            const userData = await User.findOne({_id:user._id})
            res.render("home",{user:userData})
        }else{
            return res.render("home")
        }
       
    } catch (error) {
        console.log("home page is not found");
        res.status(500).send("Server error") //pass to backend
        
    }

}

const loadSignup = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render("signup")
        }else{
            res.redirect("/")
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
        //collect the datas in req.body 
        const {name,phone,email,password,confirmPassword} = req.body;
        if(password !== confirmPassword){
            return res.render("signup",{message:"Password do not match"})
        }
        // find user for already exists
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
            res.json({success:true,redirectUrl:"/"})

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


module.exports={
    pageNotFound,
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
    
}