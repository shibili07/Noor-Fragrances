const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController")

router.get("/home",userController.loadHomepage)





module.exports=router