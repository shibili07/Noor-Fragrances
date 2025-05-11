// models/Product.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema({
  productName: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["Men", "Women", "Kids", "Unisex"],
  },
  brand: {
    type: String,
    required: true,
  },
  productType: {
    type: String,
    required: true,
  },
  fragranceFamily: {
    type: String,
    required: true,
  },
  usage: {
    type: String,
    required: true,
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  longevity: {
    type: String,
    required: true,
  },
  productOffer: {
    type: Number,
    default: 0,
  },
  productImage: {
    type: [String],
    required: true,
  },
  variants: [
    {
      size: { type: String, required: true },
      salePrice: { type: Number, default: 0 }, // Made optional
      quantity: { type: Number, required: true },
      sku: { type: String, required: true }, // Explicitly required
    },
  ],
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["Available", "outo f stock", "Discontinued"],
    required: true,
    default: "Available",
  },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);
module.exports = Product;