// models/wishlist.js
const mongoose = require("mongoose");
const { Schema } = mongoose;


const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      sku: { type: String, required: true },
    },
  ],
  addedAt: { type: Date, default: Date.now },
});


const Wishlist = mongoose.model("wishlist", wishlistSchema);
module.exports = Wishlist;