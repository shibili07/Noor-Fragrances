const mongoose = require('mongoose')
const {type} = require('os')
const {Schema,ObjectId} = mongoose;


const userSchema = new Schema({
    name : {
        type:String,
        required : true
    },

    email : {
        type : String,
        required : true,
        uniquen : true,
    },

    userImage:{
        type:[String],
        required:true
    },
    phone : {
        type : String,
        required : false,
        unique : false,
        sparse : true,
        default : 'N/A'
    },
    gender:{
        type:String,
        required:false

    },
    googleId: {
        type : String,
        unique : true,
        required : false,
        sparse : true,
    },

    password : {
        type : String,
        required : false,
        default:null
    },

    isBlocked : {
        type : Boolean,
        default : false
    },

    isAdmin : {
        type : Boolean,
        default : false
    },

    cart : [{
        type : Schema.Types.ObjectId,
        ref :"Cart",
    }],

    wallet : [{
        type : Number,
        default:0,
    }],

    wishlist:[{
        type:Schema.Types.ObjectId,
        ref:"wishlist"
    }],

    OrderHistory:[{
        type : Schema.Types.ObjectId,
        ref : "Order"
    }],
   

    referalCode:{
        type : String,
        
    },

    redeemed : {
        type : Boolean,
        //default : false
    },

    redeemedUsers:[{
        type : Schema.Types.ObjectId,
        ref : "user",
    }],

    searchHistory : [{
        category : {
            type : Schema.Types.ObjectId,
            ref : "Category",
        },
        brand : {
            type : Schema.Types.ObjectId,
            ref:"Brand"
        },
        searchOn : {
            type : Date,
            default : Date.now
        }
    }]
     
},

 { timestamps: true }

)

const User = mongoose.model('User',userSchema)
module.exports = User;