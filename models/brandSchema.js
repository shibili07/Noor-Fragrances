const mongoose = require('mongoose');
const {Schema} = mongoose;

const brandSchema = new Schema({
    brandName:{
        type: String,
        required:true,
        unique:true,
    },
    brandImage:{
        type: [String],
        required:true
    },
    description :{
        type: String,
        required: true,
    },
    Offer:{
        type:String,
        require:false,
    },
    isDeleted:{
        type:Boolean,
        default:false,
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
})

const Brand = mongoose.model('Brand',brandSchema)
module.exports = Brand;