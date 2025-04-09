const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");

const express = require("express");


const addToCart = async (req, res) => {
    try {
      const userId = req.session.user;
      const { size, quantity, productId } = req.query;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "You must be logged in to add items to the cart.",
        });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }
  
      const qty = parseInt(quantity, 10);
      const price = product.salePrice;
      const totalPrice = qty * price;
  
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        // No cart exists for the user
        cart = new Cart({
          userId,
          items: [{
            productId,
            size: [size],
            quantity: qty,
            price,
            totalPrice,
          }],
        });
      } else {
        // Cart exists - check if item already in cart
        const itemIndex = cart.items.findIndex(
          item => item.productId.toString() === productId && item.size[0] === size
        );
  
        if (itemIndex !== -1) {
          // Item exists - update quantity and total price
          cart.items[itemIndex].quantity = qty;
          cart.items[itemIndex].totalPrice = totalPrice;
        } else {
          // Add new item to cart
          cart.items.push({
            productId,
            size: [size],
            quantity: qty,
            price,
            totalPrice,
          });
        }
      }
  
      await cart.save();
  
      return res.status(200).json({
        success: true,
        message: "Item added to cart.",
        cart,
      });
  
  
    } catch (error) {
      console.error("Cart error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  
  const cart = async (req, res) => {
    try {
      const userId = req.session.user;
  
      let cart = await Cart.findOne({ userId });
  
      // If there's no cart at all, render empty cart page
      if (!cart) {
        return res.render("cart", {
          cart: null,
          user: userId,
          products: [],
          empty: true,
        });
      }
  
      // Now safe to access cart.items
      let products = [];
  
      for (let i = 0; i < cart.items.length; i++) {
        const productId = cart.items[i].productId;
        const product = await Product.findById(productId);
        if (product) {
          products.push({
            ...product.toObject(),
            quantity: cart.items[i].quantity,
          });
        }
      }
  
      res.render('cart', {
        cart: cart,
        user: userId,
        products: products,
        empty: products.length === 0, 
      });
  
    } catch (error) {
      console.log(error);
      return res.status(500).send("Something went wrong.");
    }
  };
  
const deleteFromCart = async (req,res)=>{
    const productId = req.params.id
    const userId = req.session.user
        try {
            const result = await Cart.updateOne(
                { userId },
                { $pull: { items: { productId: productId } } }
            );
    
            if (result.modifiedCount === 0) {
                return res.status(404).json({ success: false, message: 'Item not found in cart.' });
            }
    
            return res.json({ success: true });
        } catch (err) {
            console.error('Error deleting from cart:', err);
            return res.status(500).json({ success: false, message: 'Server error while deleting item.' });
        }

    
}







module.exports = {
    addToCart,
    cart,
    deleteFromCart
}