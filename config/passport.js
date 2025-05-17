const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

passport.use(new GoogleStrategy({
    
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
<<<<<<< HEAD
    callbackURL:'/auth/google/callback'
=======
    callbackURL:`${env.CLIENT_BASE}/auth/google/callback`
>>>>>>> d96c03c (Recovered from local corruption)
},

async (accessToken,refreshToken,profile,done)=>{
    try { 
        let user = await User.findOne({googleId:profile.id});
        if(user){
          if( !user.isBlocked){
            return  done(null,user);
          }else{
            return done (null,false,{message:"User is Blocked by the admin"})
          }
        }else{
            user = new User({
                name:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
            });
            await user.save();
            return done(null,user);
        }
    } catch (err) {
        return done(err,null)
        
    }
}
));


//user details assign into session

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
  .then(user=>{
    done(null,user)
  })
  .catch(err=>{
    done(err,null)
  })
});

module.exports = passport;
