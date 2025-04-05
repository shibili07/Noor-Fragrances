const User = require("../../models/userSchema")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const pageError = async(req,res)=>{
    res.render("admin-error")
}

const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null })
}
const login = async (req,res) =>{
    try {
        
        const {email,password}=req.body
       
        const admin = await User.findOne({isAdmin:true,email})

        if(!admin){
            return res.redirect("/admin/login")
        }
        console.log(password);
        
        const passwordMatch = await bcrypt.compare(password,admin.password)
        if(!passwordMatch){
            
            return res.redirect("/admin/login")
             
        }
        req.session.admin = true 
        if(req.session.admin){
            res.redirect("/admin")
        }else{
            res.redirect("/admin/login")
        }

    }catch(error) {
        console.error('Admin login error',error)
        return res.redirect("/pageError")
    }
}

const loadDashboard = async(req,res)=>{
    if(req.session.admin){
        try {
            res.render("dashboard")
        } catch (error) {
            res.redirect("/pageError")
        }
    }else{
        res.redirect("/admin/login")
    }
}


const logout = async(req,res)=>{
    try {
        req.session.destroy(err =>{
            if(err){
                console.log("Erro destroying session",err);
                return res.redirect("/pageError")
            }else{
                return res.redirect("/admin/login")
            }
           
        })
    } catch (error) {
        console.log("unexpected error during logout",error);
        res.redirect("/pageError")
        
        
    }
    
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,
    
}  