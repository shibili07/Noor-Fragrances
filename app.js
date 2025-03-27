const express = require("express")
const app = express();
const path = require("path")
const env = require("dotenv").config()
const session = require("express-session")
const passport = require("./config/passport")
const db = require("./config/db")
const userRouter = require("./routes/userRouter")
db();

app.use(express.json())
//parse form datas
app.use(express.urlencoded({extended:true}))
//session
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*1000
    }
}))

app.use(passport.initialize());
app.use(passport.session());

//setting cache control the cache datas are never stored
//middleware
app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

//view engine
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use(express.static(path.join(__dirname,"public")))

//userRouter set 
app.use("/",userRouter)
app.listen(process.env.PORT,()=>{
    console.log("server port 7000 running....");

})

module.exports = app;