const mongoose = require("mongoose")
const env = require("dotenv").config();

const connectDb = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("DB connected");
        
        
    } catch (error) {
        console.log("DB Connection error",error.message);
        process.exit
    }
}

module.exports = connectDb;