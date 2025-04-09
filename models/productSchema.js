const mongoose = require("mongoose")
const {Schema} = mongoose
 

const productSchema = new Schema({
    productName : {
        type :String,
        required:true,
    },
    shortDescription:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    gender: {
        type: String,
        required: true,
        enum: ["Men", "Women", "Kids", "Unisex"]
    },

    brand:{
        type:String,
        required:true, 
    },
    productType:{
        type:String,
        required:true, 
    },
    fragranceFamily:{
        type:String,
        required:true, 
    },
    size: {
        type: String,
        required: true,
    },
    usage:{
        type:String,
        required:true, 
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required : true,
    },
    regularPrice:{
        type : Number,
        required : true,
    },
    longevity:{
        type:String,
        required:true,
    },
    salePrice:{
        type : Number,
        required : true,
    },
    productOffer:{
        type:Number,
        default:0,
    },
    quantity:{
        type:Number,
        default : true
    },
    productImage:{
        type:[String],
        required :true ,
    },
    isBlocked:{
        type:Boolean,
        default :false 
    },
    isListed:{
        type:Boolean,
        default : true
    },
    isDeleted:{
        type:Boolean,
        default : false
    },
    
    status :{
        type:String,
        enum:["Available","out of stock","Discountinued"],
        required : true ,
        default :"Available"
    },

 
},{timestamps:true});

const Product = mongoose.model("Product",productSchema)
module.exports = Product;