const express = require("express")
const app = express();
const path = require("path")
const env = require("dotenv").config()
const session = require("express-session")
const passport = require("./config/passport")
const db = require("./config/db")
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter")
db();

app.use(express.json())

app.use(express.urlencoded({extended:true}))
//session
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge: 3 * 24 * 60 * 60 * 1000 // 3 days

    }
}))

app.use(passport.initialize());
app.use(passport.session());


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/user"), path.join(__dirname, "views/admin")]);
app.use(express.static(path.join(__dirname,"public")))
app.use('/uploads', express.static('uploads'));

app.use("/",userRouter)

app.use("/admin",adminRouter)


app.get("/admin/*", (req, res) => {
    res.redirect("/admin");
});

app.get("/*", (req, res) => {
    res.redirect('/');
});



//error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); 
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
        }
    })
});




app.listen(process.env.PORT,()=>{
    console.log("server port 7000 running....");

})

module.exports = app;



//   admin informations //
// ----------------------- //

// email : admin@noorFragrances.com  //
// password : shibil7034    //