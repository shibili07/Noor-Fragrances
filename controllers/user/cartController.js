const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order= require("../../models/orderSchema")
const express = require("express");
const Address = require("../../models/addressSchema");
const Coupon = require("../../models/couponSchema")
const Offer = require("../../models/offerSchema")
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const wishlist = require("../../models/wishlistSchema");
const Wishlist = require("../../models/wishlistSchema");
const Wallet = require("../../models/walletSchema")



const addToCart = async (req, res) => {
  try {

    console.log(req.query,"added to cart this items");
    
    const userId = req.session.user;
    const { size, quantity, productId,flag} = req.query;
 

    if (flag==="1") {
      //if we add from the wish list this item will be delete from the wish list 
      const wishlist = await Wishlist.findOne({ userId });
      const productIndex = wishlist.items.findIndex(item => item.product.toString() === productId.toString());
      wishlist.items.splice(productIndex, 1);
      await wishlist.save();
    }
    


    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to add items to the cart.",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isBlocked: false,
      isDeleted: false
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const variant = product.variants.find((v) => v.size === size);
    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Invalid size for this product.",
      });
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number.",
      });
    }

    const price = variant.salePrice;
    const totalPrice = qty * price;

    let cart = await Cart.findOne({ userId }); 
    if (!cart) {
      cart = new Cart({
        userId,
        items: [
          {
            productId,
            size: variant.size,
            quantity: qty,
            price,
            totalPrice,
          },
        ],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId && item.size === size 
      );

      if (itemIndex !== -1) {
        cart.items[itemIndex].quantity = qty;
        cart.items[itemIndex].totalPrice = totalPrice;
      } else {
        cart.items.push({
          productId,
          size: variant.size,
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





const productQuantity =  async (req, res) => {
  try {
      const user = req.session.user
      
      const { productId, size } = req.query;

      if (!productId || !size) {
          return res.status(400).json({ success: false, message: 'Product ID and size are required.' });
      }

      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found.' });
      }

      const variant = product.variants.find(v => v.size === size);
      if (!variant) {
          return res.status(404).json({ success: false, message: 'Variant not found.' });
      }

      res.json({ success: true, stock: variant.quantity });
  } catch (error) {
      console.error('Error fetching stock:', error);
      res.status(500).json({ success: false, message: 'Server error.' });
  }
}


//best offer getting functionality

const getBestOfferForItem = async (product, variantPrice) => {
  if (!product || !variantPrice || variantPrice <= 0) {
    return {
      bestOffer: null,
      discountAmount: 0,
      offerPercentage: 0,
      discountedPrice: variantPrice.toFixed(2),
    };
  }

  const now = new Date();

  const offers = await Offer.find({
    isListed: true,
    isDeleted: false,
    validFrom: { $lte: now },
    validUpto: { $gte: now },
    $or: [
      { offerType: 'Product', applicableTo: product._id },
      { offerType: 'Category', applicableTo: product.category },
    ],
  });

  let bestOffer = null;
  let maxDiscount = 0;
  let offerPercentage = 0;
  let discountedPrice = variantPrice;

  for (const offer of offers) {
    let discount = 0;
    if (offer.discountType === 'flat') {
      discount = offer.discountAmount;
      if (variantPrice > 0) {
        offerPercentage = (discount / variantPrice) * 100;
      }
    } else if (offer.discountType === 'percentage') {
      discount = (variantPrice * offer.discountAmount) / 100;
      offerPercentage = offer.discountAmount;
    }

    if (discount > maxDiscount) {
      maxDiscount = discount;
      bestOffer = offer;
      discountedPrice = Math.max(variantPrice - discount, 0); // Ensure non-negative
    }
  }

  return {
    bestOffer,
    discountAmount: maxDiscount.toFixed(2),
    offerPercentage: offerPercentage.toFixed(0),
    discountedPrice: discountedPrice.toFixed(2),
  };
};


//cart 

const cart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const coupons = await Coupon.find({
      isDeleted: false,
      isListed: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      $or: [{ userId }, { userId: { $exists: false } }],
    });
    const cart = await Cart.findOne({ userId });

    if (!cart || !cart.items.length) {
      return res.render('cart', {
        cart: { items: [] },
        user,
        products: [],
        empty: true,
        orderSummary: {
          total: 0,
          shipping: 0,
          discount: 0,
          offerDiscount: 0,
          grandTotal: 0,
        },
        coupons,
      });
    }

    const productDetails = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findOne({
          _id: item.productId,
          isBlocked: false,
          isDeleted: false,
        });

        if (!product) {
          console.log(`Product not found for productId: ${item.productId}`);
          return null;
        }

        const variant = product.variants.find((v) => v.size === item.size);
        if (!variant) {
          console.log(`Variant not found for productId: ${item.productId}, size: ${item.size}`);
          console.log(`Available variants:`, product.variants);
          return {
            ...product.toObject(),
            cartItemId: item._id,
            selectedSize: item.size,
            cartQuantity: item.quantity,
            cartPrice: item.price,
            cartSpain: item.totalPrice,
            status: 'out of stock',
            variantQuantity: 0,
            bestOffer: null,
            discountAmount: 0,
            offerPercentage: 0,
            discountedPrice: item.price,
            originalPrice: item.price,
          };
        }

        const variantPrice = variant.salePrice > 0 ? variant.salePrice : variant.regularPrice;
        if (typeof variantPrice !== 'number' || variantPrice <= 0) {
          console.log(`Invalid price for productId: ${item.productId}, variant:`, variant);
          return {
            ...product.toObject(),
            cartItemId: item._id,
            selectedSize: item.size,
            cartQuantity: item.quantity,
            cartPrice: item.price,
            cartTotalPrice: item.totalPrice,
            status: 'out of stock',
            variantQuantity: variant.quantity,
            bestOffer: null,
            discountAmount: 0,
            offerPercentage: 0,
            discountedPrice: item.price,
            originalPrice: item.price,
          };
        }

        const isOutOfStock =
          product.status === 'out of stock' ||
          product.isBlocked ||
          !product.isListed ||
          !variant ||
          variant.quantity === 0;

        const { bestOffer, discountAmount, offerPercentage, discountedPrice } = await getBestOfferForItem(
          product,
          variantPrice
        );

        return {
          ...product.toObject(),
          cartItemId: item._id,
          selectedSize: item.size,
          cartQuantity: item.quantity,
          cartPrice: item.price, // Should be discounted price (ensured by cartQuantityCheck)
          cartTotalPrice: item.totalPrice, // Should be discounted price * quantity
          status: isOutOfStock ? 'out of stock' : product.status,
          variantQuantity: variant.quantity,
          bestOffer,
          discountAmount: parseFloat(discountAmount) * item.quantity,
          offerPercentage,
          discountedPrice: parseFloat(discountedPrice),
          originalPrice: variantPrice,
        };
      })
    );

    const validProducts = productDetails.filter((p) => p);

    let orderSummary = {
      total: 0,
      shipping: 0,
      discount: 0,
      offerDiscount: 0,
      grandTotal: 0,
    };

    validProducts.forEach((product) => {
      if (product.status !== 'out of stock') {
        orderSummary.total += product.originalPrice * product.cartQuantity; // Total based on original price
        orderSummary.offerDiscount += parseFloat(product.discountAmount || 0);
      }
    });

    orderSummary.discount = orderSummary.offerDiscount + (cart.discount || 0);
    orderSummary.grandTotal = orderSummary.total - orderSummary.discount;

    res.render('cart', {
      user,
      cart,
      products: validProducts,
      empty: validProducts.length === 0,
      orderSummary: {
        total: orderSummary.total.toFixed(2),
        shipping: orderSummary.shipping.toFixed(2),
        discount: orderSummary.discount.toFixed(2),
        offerDiscount: orderSummary.offerDiscount.toFixed(2),
        grandTotal: orderSummary.grandTotal.toFixed(2),
      },
      coupons,
    });
  } catch (error) {
    console.error('Cart error:', error);
    res.status(500).send('Something went wrong while loading your cart.');
  }
};

const cartQuantityCheck = async (req, res) => {
  try {
    const { productId, size, quantity } = req.body;
    const userId = req.session.user;

    // Input validation
    if (!productId || !size || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, size, and quantity are required',
      });
    }

    const newQuantity = parseInt(quantity);
    if (isNaN(newQuantity) || newQuantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1',
      });
    }
    if (newQuantity > 5) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot exceed 5',
      });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product.status === 'out of stock' || product.isBlocked || !product.isListed) {
      return res.status(400).json({
        success: false,
        message: 'Product is out of stock or unavailable',
      });
    }

    // Find variant
    const variant = product.variants.find((v) => v.size === size);
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Selected size not found',
      });
    }

    // Fetch cart
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Find cart item
    const cartItem = cart.items.find(
      (item) => item.productId.toString() === productId && item.size === size
    );
    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart',
      });
    }

    // Check stock availability for increasing quantity
    const currentQuantity = cartItem.quantity;
    if (newQuantity > currentQuantity && newQuantity > variant.quantity) {
      return res.status(400).json({
        success: false,
        message: `Cannot increase quantity. Only ${variant.quantity} items available in stock`,
      });
    }

    // Get base price and best offer
    const variantPrice = variant.salePrice > 0 ? variant.salePrice : variant.regularPrice;
    const { bestOffer, discountAmount, offerPercentage, discountedPrice } = await getBestOfferForItem(
      product,
      variantPrice
    );

    // Update cart item with discounted price
    cartItem.quantity = newQuantity;
    cartItem.price = parseFloat(discountedPrice); // Store discounted price per unit
    cartItem.totalPrice = parseFloat(discountedPrice) * newQuantity; // Total based on discounted price

    await cart.save();

    // Calculate order summary
    let orderSummary = {
      total: 0,
      shipping: 0,
      discount: 0,
      offerDiscount: 0,
      grandTotal: 0,
    };

    for (let item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const variant = product.variants.find((v) => v.size === item.size);
        const isOutOfStock =
          product.status === 'out of stock' ||
          product.isBlocked ||
          !product.isListed ||
          !variant ||
          variant.quantity === 0;
        if (!isOutOfStock) {
          const itemVariantPrice = variant.salePrice > 0 ? variant.salePrice : variant.regularPrice;
          const { discountAmount: itemDiscount } = await getBestOfferForItem(product, itemVariantPrice);
          orderSummary.total += itemVariantPrice * item.quantity; // Total based on original price
          orderSummary.offerDiscount += parseFloat(itemDiscount) * item.quantity;
        }
      }
    }

    orderSummary.discount = orderSummary.offerDiscount + (cart.discount || 0);
    orderSummary.grandTotal = orderSummary.total - orderSummary.discount;

    // Return response
    return res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      quantity: cartItem.quantity,
      subtotal: cartItem.totalPrice.toFixed(2), // Subtotal based on discounted price
      offerPercentage: bestOffer ? offerPercentage : 0,
      discountedPrice: parseFloat(discountedPrice),
      originalPrice: variantPrice,
      orderSummary: {
        total: orderSummary.total.toFixed(2),
        shipping: orderSummary.shipping.toFixed(2),
        discount: orderSummary.discount.toFixed(2),
        offerDiscount: orderSummary.offerDiscount.toFixed(2),
        grandTotal: orderSummary.grandTotal.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Error in cartQuantityCheck:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while updating quantity',
    });
  }
};


const deleteFromCart = async (req, res) => {
  try {
      const userId = req.session.user;
      const { productId, size } = req.body;
      const result = await Cart.updateOne(
          { userId: userId },
          { $pull: { items: { productId: productId, size: size } } }
      );

      if (result.modifiedCount > 0) {
          return res.json({ success: true });
      } else {
          return res.json({ success: false, message: 'Item not found in cart' });
      }
  } catch (error) {
      console.error("Delete from cart error:", error);
      return res.status(500).json({ success: false, message: 'Server error' });
  }
};




// Generate unique orderId
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



// Generate unique orderId
const generateOrderId = (prefix = 'ORD') => {
  const part1 = String(Math.floor(Math.random() * 1000000)).padStart(6, '0'); // 6 digits with leading zeros
  const part2 = Math.floor(100000 + Math.random() * 900000); // random 6-digit number
  return `${prefix}-${part1}-${part2}`;
};



const checkOut = async (req, res) => {
  try {
    const userId = req.session.user;
    
    if (!userId) {
      return res.redirect('/login');
    }
    const userData = await User.findById(userId);
    if (!userData) {
      return res.redirect('/login');
    }
    const cart = await Cart.findOne({ userId });
    const addressDoc = await Address.findOne({ userId });
    const wallet = await Wallet.findOne({ userId: userId });

    // Check if cart exists and has items
    if (!cart || !cart.items.length) {
      return res.render('checkOut', {
        user: userData,
        cart: null,
        addresses: addressDoc ? addressDoc.address : [],
        products: [],
        subtotal: '0.00',
        savings: '0.00',
        couponDiscount: '0.00',
        grandTotal: '0.00',
        size: [],
        appliedCoupon: null,
        availableCoupons: [],
        error: 'Your cart is empty.',
        wallet
      });
    }

    // Prepare products
    let subtotal = 0;
    let savings = 0;
    let validProducts = [];
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const product = await Product.findById(item.productId).populate('category');
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        continue;
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0 || product.status === 'out of stock') {
        continue;
      }
      // Calculate price
      const salePrice = variant.salePrice || variant.regularPrice;
      const updatedQuantity = item.quantity;
      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category._id },
        ],
        isListed: true,
        isDeleted: false,
        validFrom: { $lte: new Date() },
        validUpto: { $gte: new Date() },
      }).lean();
      // Select best offer
      let bestOffer = null;
      let maxDiscount = 0;
      let offerPrice = salePrice;
      offers.forEach((offer) => {
        let discount = 0;
        if (offer.discountType === 'flat') {
          discount = offer.discountAmount;
        } else if (offer.discountType === 'percentage') {
          discount = salePrice * (offer.discountAmount / 100);
        }
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestOffer = offer;
          offerPrice = Math.max(0, salePrice - discount);
        }
      });
      const itemTotal = offerPrice * updatedQuantity;
      // Update cart
      cart.items[i].quantity = updatedQuantity;
      cart.items[i].price = offerPrice;
      cart.items[i].totalPrice = itemTotal;
      validProducts.push({
        ...product.toObject(),
        quantity: updatedQuantity,
        selectedSize: item.size,
        salePrice: salePrice.toFixed(2),
        offerPrice: offerPrice.toFixed(2),
        cartTotalPrice: itemTotal.toFixed(2),
        bestOffer,
        offerSavings: (salePrice - offerPrice).toFixed(2),
        offerType: bestOffer ? bestOffer.offerName : 'No Offer',
      });
      subtotal += salePrice * updatedQuantity;
      savings += maxDiscount * updatedQuantity;
    }
    if (validProducts.length === 0) {
      return res.render('checkOut', {
        user: userData,
        cart,
        addresses: addressDoc ? addressDoc.address : [],
        products: [],
        subtotal: '0.00',
        savings: '0.00',
        couponDiscount: '0.00',
        grandTotal: '0.00',
        size: [],
        appliedCoupon: null,
        availableCoupons: [],
        error: 'No valid products in cart.',
        wallet
      });
    }
    // Fetch available coupons
    const availableCoupons = await Coupon.find({
      isListed: true,
      isDeleted: false,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      $or: [{ userId: { $exists: false } }, { userId }],
    });
    // Apply coupon from session
    let couponDiscount = 0;
    let appliedCoupon = null;
    const sessionCoupon = req.session.appliedCoupon;
    if (sessionCoupon) {
      const coupon = await Coupon.findOne({
        couponCode: sessionCoupon.code,
        isListed: true,
        isDeleted: false,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [{ userId: { $exists: false } }, { userId }],
      });
      if (coupon && subtotal - savings >= coupon.minimumPrice) {
        couponDiscount = coupon.offerPrice;
        appliedCoupon = {
          code: coupon.couponCode,
          name: coupon.couponName,
          offerPrice: coupon.offerPrice,
        };
      }
    }
    const grandTotal = Math.max(0, subtotal - savings - couponDiscount);
    await cart.save();
    res.render('checkOut', {
      user: userData,
      cart,
      addresses: addressDoc ? addressDoc.address : [],
      products: validProducts,
      subtotal: subtotal.toFixed(2),
      savings: savings.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      size: validProducts.map((p) => p.selectedSize),
      appliedCoupon,
      availableCoupons,
      error: sessionCoupon && !appliedCoupon ? 'Invalid or expired coupon.' : null,
      wallet
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.render('checkOut', {
      user: null,
      cart: null,
      addresses: [],
      products: [],
      subtotal: '0.00',
      savings: '0.00',
      couponDiscount: '0.00',
      grandTotal: '0.00',
      size: [],
      appliedCoupon: null,
      availableCoupons: [],
      error: 'Something went wrong while loading the checkout page.',
      wallet: null
    });
  }
};



const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    const { couponCode } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Please log in to apply a coupon.' });
    }

    if (!couponCode || typeof couponCode !== 'string') {
      return res.status(400).json({ success: false, error: 'Coupon code is required.' });
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, error: 'Your cart is empty.' });
    }

    // Calculate subtotal and savings
    let subtotal = 0;
    let savings = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.productId).populate('category');
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        continue;
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0) {
        continue;
      }
      const salePrice = variant.salePrice || variant.regularPrice;

      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category._id },
        ],
        isListed: true,
        isDeleted: false,
        validFrom: { $lte: new Date() },
        validUpto: { $gte: new Date() },
      }).lean();

      // Select best offer
      let maxDiscount = 0;
      offers.forEach((offer) => {
        let discount = 0;
        if (offer.discountType === 'flat') {
          discount = offer.discountAmount;
        } else if (offer.discountType === 'percentage') {
          discount = salePrice * (offer.discountAmount / 100);
        }
        if (discount > maxDiscount) {
          maxDiscount = discount;
        }
      });

      subtotal += salePrice * item.quantity;
      savings += maxDiscount * item.quantity;
    }

    const coupon = await Coupon.findOne({
      couponCode: couponCode.trim(),
      isListed: true,
      isDeleted: false,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
      $or: [{ userId: { $exists: false } }, { userId }],
    });

    if (!coupon) {
      return res.status(400).json({ success: false, error: 'Invalid or expired coupon code.' });
    }

    const cartTotalAfterSavings = subtotal - savings;
    if (cartTotalAfterSavings < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        error: `Cart total must be at least ₹${coupon.minimumPrice} after discounts to apply this coupon.`,
      });
    }

    const couponDiscount = Math.min(coupon.offerPrice, cartTotalAfterSavings);
    const grandTotal = Math.max(0, cartTotalAfterSavings - couponDiscount);

    // Store coupon in session
    req.session.appliedCoupon = { code: coupon.couponCode, discount: couponDiscount };

    res.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      savings: savings.toFixed(2),
      couponDiscount: couponDiscount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      coupon: {
        code: coupon.couponCode,
        name: coupon.couponName,
        offerPrice: coupon.offerPrice,
      },
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ success: false, error: 'Unable to apply coupon due to a server error.' });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, error: 'Please log in.' });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, error: 'Cart is empty.' });
    }

    // Calculate subtotal and savings
    let subtotal = 0;
    let savings = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.productId).populate('category');
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        continue;
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0) {
        continue;
      }
      const salePrice = variant.salePrice || variant.regularPrice;

      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category._id },
        ],
        isListed: true,
        isDeleted: false,
        validFrom: { $lte: new Date() },
        validUpto: { $gte: new Date() },
      }).lean();

      // Select best offer
      let maxDiscount = 0;
      offers.forEach((offer) => {
        let discount = 0;
        if (offer.discountType === 'flat') {
          discount = offer.discountAmount;
        } else if (offer.discountType === 'percentage') {
          discount = salePrice * (offer.discountAmount / 100);
        }
        if (discount > maxDiscount) {
          maxDiscount = discount;
        }
      });

      subtotal += salePrice * item.quantity;
      savings += maxDiscount * item.quantity;
    }

    // Clear coupon from session
    req.session.appliedCoupon = null;

    const grandTotal = Math.max(0, subtotal - savings);

    res.json({
      success: true,
      subtotal: subtotal.toFixed(2),
      savings: savings.toFixed(2),
      couponDiscount: '0.00',
      grandTotal: grandTotal.toFixed(2),
      coupon: null,
    });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ success: false, error: 'Unable to remove coupon due to a server error.' });
  }
};



const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    const { cartId, address, payment, couponCode } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Please log in.');
    }

    const user = await User.findById(userId);
    const cart = await Cart.findById(cartId);
    const addressDoc = await Address.findOne({ userId });

    if (!user || !cart || !cart.items.length) {
      throw new Error('Invalid cart or user.');
    }

    // Validate address
    const selectedAddress = addressDoc?.address.find((addr) =>
      addr._id.equals(address)
    );
    if (!selectedAddress) {
      throw new Error('Invalid address selected.');
    }

    // Prepare order items and update stock
    let subtotal = 0;
    let offerDiscount = 0;
    const orderedItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId).populate('category');
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        continue;
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0) {
        continue;
      }
      // Validate sufficient stock
      if (variant.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.productName} (${item.size}ml). Available: ${variant.quantity}`);
      }
      const salePrice = variant.salePrice || variant.regularPrice;

      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category._id },
        ],
        isListed: true,
        isDeleted: false,
        validFrom: { $lte: new Date() },
        validUpto: { $gte: new Date() },
      }).lean();

      // Select best offer
      let maxDiscount = 0;
      let offerPrice = salePrice;
      offers.forEach((offer) => {
        let discount = 0;
        if (offer.discountType === 'flat') {
          discount = offer.discountAmount;
        } else if (offer.discountType === 'percentage') {
          discount = salePrice * (offer.discountAmount / 100);
        }
        if (discount > maxDiscount) {
          maxDiscount = discount;
          offerPrice = Math.max(0, salePrice - discount);
        }
      });

      const sku = variant.sku || `SKU-${product._id}-${item.size}`;

      orderedItems.push({
        product: product._id,
        name: product.productName,
        sku,
        size: item.size,
        quantity: item.quantity,
        price: offerPrice,
        status: 'Pending',
      });

      subtotal += salePrice * item.quantity;
      offerDiscount += maxDiscount * item.quantity;

      // Decrease stock for the ordered variant
      variant.quantity -= item.quantity;
      await product.save();
    }

    if (orderedItems.length === 0) {
      throw new Error('No valid items to order.');
    }

    let couponDiscount = 0;
    let couponApplied = false;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        couponCode,
        isListed: true,
        isDeleted: false,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [{ userId: { $exists: false } }, { userId }],
      });

      if (coupon && subtotal - offerDiscount >= coupon.minimumPrice) {
        couponDiscount = coupon.offerPrice;
        couponApplied = true;
      }
    }

    // Map payment method to orderType
    const orderTypeMap = {
      cod: 'cod',
      razorpay: 'razorPay',
      wallet: 'wallet'
    };
    const orderType = orderTypeMap[payment];
    if (!orderType) {
      throw new Error('Invalid payment method.');
    }

    let orderId;
    let isUnique = false;
    while (!isUnique) {
      orderId = generateOrderId();
      const existingOrder = await Order.findOne({ orderId });
      if (!existingOrder) isUnique = true;
    }

    // Create order
    const order = await Order.create({
      orderId,
      userId,
      orderedItems,
      totalPrice: subtotal,
      couponDiscount,
      offerDiscount,
      finalAmount: Math.max(0, subtotal - offerDiscount - couponDiscount),
      paymentAmount: Math.max(0, subtotal - offerDiscount - couponDiscount),
      address: {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        altPhone: selectedAddress.altPhone || '',
        landMark: selectedAddress.landMark,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
        addressType: selectedAddress.addressType,
      },
      razorpayOrderId: "",
      orderType,
      status: 'Pending',
      couponApplied,
      createdOn: new Date(),
      couponCode
    });

    // Update User.OrderHistory and clear cart
    await User.findByIdAndUpdate(userId, {
      $push: { OrderHistory: order._id },
    });

    req.session.appliedCoupon = null;

    return order;
  } catch (error) {
    console.error('Place order error:', error);
    throw error;
  }
};



const cod = async (req, res) => {
  try {
    const order = await placeOrder(req, res);
    res.json({ success: true, orderId: order._id, message: 'Order placed successfully with Cash on Delivery.' });
  } catch (error) {
    console.error('COD order error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to place order due to a server error.',
      errorCode: 'SERVER_ERROR',
    });
  }
};


const checkoutRazorpay = async (req, res) => {
  try {
    const { cartId, address, couponCode } = req.body;
    console.log(cartId, address, couponCode ,"=======================================================1");
    
    // Log the incoming request data
    // console.log('Razorpay checkout request:', { cartId, address, couponCode });

    const order = await placeOrder(
      { ...req, body: { cartId, address, payment: 'razorpay', couponCode } },
      res
    );
    
    // Log the created order
    console.log('Created order:');

    // Validate amount
    if (!order || !order.finalAmount || order.finalAmount <= 0) {
      console.error('Invalid order amount:', order?.finalAmount);
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount',
        errorCode: 'INVALID_AMOUNT'
      });
    }

    const amount = Math.round(order.finalAmount * 100); // Convert to paise
    if (amount < 100) { // Minimum amount check (₹1)
      console.error('Amount too small:', amount);
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1',
        errorCode: 'MIN_AMOUNT_ERROR'
      });
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `order_${order._id}`,
    };

    // Log the Razorpay options
    console.log('Razorpay options:', options);

    try {
      const razorpayOrder = await razorpay.orders.create(options);
      console.log('Razorpay order created:', razorpayOrder);
      // order.razorpayOrderId=razorpayOrder.id
      await Order.findByIdAndUpdate(order._id, {
        razorpayOrderId: razorpayOrder.id
      });
      // Return the order details to the client
      return res.json({
        success: true,
        orderId: order._id,
        razorpayOrderId: razorpayOrder.id,
        amount: order.finalAmount,
      });
    } catch (razorpayError) {
      console.error('Razorpay API error:', razorpayError);
      
      // Check if it's an authentication error
      if (razorpayError.statusCode === 401) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Razorpay credentials',
          errorCode: 'RAZORPAY_AUTH_ERROR'
        });
      }
      
      // Check if it's a validation error
      if (razorpayError.statusCode === 400) {
        return res.status(400).json({
          success: false,
          message: razorpayError.error?.description || 'Invalid request to Razorpay',
          errorCode: 'RAZORPAY_VALIDATION_ERROR'
        });
      }

      throw razorpayError; // Re-throw other errors to be caught by outer catch
    }
  } catch (error) {
    console.error('Razorpay checkout error:', error);
    
    // If headers are already sent, don't try to send another response
    if (res.headersSent) {
      return;
    }

    // Send error response with more details
    return res.status(500).json({
      success: false,
      message: 'Unable to initiate Razorpay payment.',
      errorCode: 'PAYMENT_INIT_FAILED',
      errorDetails: error.message || 'Unknown error occurred'
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
  
    
    if (expectedSignature === razorpay_signature ) {
     
      await Order.findByIdAndUpdate(orderId, {
        status: 'Pending',
        paymentId: razorpay_payment_id,
        orderType: 'razorPay',
      });
      res.json({ success: true, message: 'Payment verified successfully.' });
    } else {

      if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing order ID.',
          errorCode: 'INVALID_ORDER_ID',
        });
      }

      const order = await Order.findOneAndUpdate(
        { orderId },
        {
          $set: {
            status: 'Payment failed',
            cancellationReason: 'Invalid payment signature, your payment could not be verified.',
            'orderedItems.$[].status': 'Payment failed', // Update all items' statuses
            'orderedItems.$[].cancellationReason': 'Invalid payment signature, your payment could not be verified.', // Optional
          },
        },
        {
          new: true,
          runValidators: true, 
        }
      );
       
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found.',
          errorCode: 'ORDER_NOT_FOUND',
        });
      }
      const failedItems = order.orderedItems.filter(item => item.status === 'Payment failed');
      console.log('Items with Payment failed status:', failedItems);
  
      // Return failure response
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature, your payment could not be verified.',
        errorCode: 'INVALID_SIGNATURE',
      });
    }

  } catch (error) {
    console.error('Verify payment error:', error);
    await Order.findByIdAndUpdate(req.body.orderId, { 
      status: 'Cancelled',
      cancellationReason: 'Payment verification failed'
    });
    res.status(500).json({
      success: false,
      message: 'Unable to verify payment.',
      errorCode: 'PAYMENT_VERIFICATION_FAILED',
    });
  }
};

const orderSuccess = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.orderId;
    const userData = await User.findById(userId)
    const cart = await Cart.findOne({userId})
    
    cart.items = [];
    await cart.save()

    if (!userId || !orderId ) {
      return res.render('orderFailed', {
        message: 'Invalid order or user session.',
        errorCode: 'INVALID_REQUEST',
      });
    }

    const order = await Order.findOne({ _id: orderId, userId }).lean();
    if (!order) {
      return res.render('orderFailed', {
        user:userData,
        message: 'Order not found.',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }


    res.render('orderSuccess', {
      order,
      user:userData,
      address: order.address,
    });
  } catch (error) {
    console.error('Error loading order success page:', error);
    res.status(500).render('orderFailed', {
      message: 'Something went wrong while showing your order confirmation.',
      errorCode: 'SERVER_ERROR',
    });
  }
};
const orderFailed = async (req, res) => {
  try {
    const { orderId, errorCode, message } = req.query; // Or req.body for POST
    const userId = req.session.user;
    console.log(orderId);
    const cart = await Cart.findOne({userId})
    cart.items = [];
    await cart.save()
   
    // Validate message (fallback to default if missing)
    const cancellationReason = message && typeof message === 'string' 
      ? message 
      : 'Invalid payment signature, your payment could not be verified.';

     console.log(cancellationReason);
     
    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: 'Payment failed',
          cancellationReason,
          'orderedItems.$[].status': 'Payment failed',
          'orderedItems.$[].cancellationReason': cancellationReason, // Optional
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
  

    if(order){
      console.log("sanam update aavnd");
      
    }

    const userData = await User.findById(userId);
    // Check if order exists
    if (!order) {
      return res.status(404).render('orderFailed', {
        user: userData,
        orderId,
        order: null,
        errorCode: 'ORDER_NOT_FOUND',
        message: 'Order not found.',
      });
    }

   

    res.render('orderFailed', {
      user: userData,
      orderId,
      order,
      errorCode: errorCode || 'PAYMENT_FAILED',
      message: cancellationReason,
    });
  } catch (error) {
    console.error('Error in orderFailed:', error.message);
    res.status(500).render('orderFailed', {
      user: null,
      orderId: null,
      order: null,
      errorCode: 'SERVER_ERROR',
      message: 'Something went wrong while processing your request.',
    });
  }
};


const checkoutWallet = async (req, res) => {
  try {
    const { cartId, address, couponCode } = req.body;
    const userId = req.session.user;
     
    // Validate user session
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Please log in to continue',
        errorCode: 'UNAUTHORIZED'
      });
    }

    const wallet = await Wallet.findOne({ userId });
    const cart = await Cart.findOne({userId})
    let totalAmount = 0
    cart.items.forEach(items=>{
        totalAmount += items.quantity*items.totalPrice
    })
   
    // Check if wallet has sufficient balance
    if (wallet.balance <=totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        errorCode: 'INSUFFICIENT_BALANCE',
        requiredAmount: totalAmount,
        availableBalance: wallet.balance
      });
    }

    // Create order
    const order = await placeOrder(
      { ...req, body: { cartId, address, payment: 'wallet', couponCode } },
      res
    );

  
    try {
      // Deduct amount from wallet
      wallet.balance -= order.finalAmount;
      wallet.transactions.push({
        amount: order.finalAmount,
        type: 'Debit',
        method: 'OrderPayment',
        status: 'Completed',
        description: `Payment for Order ${order.orderId}`,
      });

      await wallet.save();

      // Update order status
      await Order.findByIdAndUpdate(
        order._id,
        {
          status: 'Pending',
          paymentId: `WALLET_${Date.now()}`,
          orderType: 'wallet'
        }
      );

      return res.json({
        success: true,
        orderId: order._id,
        message: 'Order placed successfully using wallet balance.'
      });

    } catch (error) {
      // If wallet update fails, try to revert the order
      try {
        await Order.findByIdAndUpdate(
          order._id,
          {
            status: 'Cancelled',
            cancellationReason: 'Wallet payment failed'
          }
        );
      } catch (revertError) {
        console.error('Error reverting order:', revertError);
      }
      throw error;
    }

  } catch (error) {
    console.error('Wallet checkout error:', error);
    
    // If the error is from placeOrder, return appropriate error
    if (error.message === 'Please log in.') {
      return res.status(401).json({
        success: false,
        message: error.message,
        errorCode: 'UNAUTHORIZED'
      });
    }
    if (error.message === 'Invalid cart or user.' || 
        error.message === 'Invalid address selected.' ||
        error.message === 'No valid items to order.' ||
        error.message === 'Invalid payment method.') {
      return res.status(400).json({
        success: false,
        message: error.message,
        errorCode: 'INVALID_REQUEST'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to process wallet payment',
      errorCode: 'WALLET_PAYMENT_FAILED'
    });
  }
};




  
const retryRazorpayPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user;
    console.log(orderId);
    
    console.log('retryRazorpayPayment called with orderId:', orderId, 'userId:', userId);
   
     
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Please log in to retry payment.' });
    }
  
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }
   
    const order = await Order.findById(orderId)
    console.log(order);
    
    
    const amount = Math.round(order.finalAmount * 100);
    if (amount < 100) {
      return res.status(400).json({ success: false, message: 'Amount must be at least ₹1.' });
    }
    
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `retry_order_${orderId}`,
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    console.log(razorpayOrder,"thuszjkxlchzsjkf zsdf dsz jfhsdfkjsdfsa sdhfjskadfh Dfhaf Dd fasjkdf hasd fsdf  hsdf");
    
   
    await Order.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });
   
    return res.json({
      success: true,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: order.finalAmount,
    });
  } catch (error) {
    console.error('Retry Razorpay payment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to initiate retry payment.' });
  }
};



const verifyRetryPayment = async (req,res) => {
  try {
     
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.session.user;
   
    console.log(req.body);
    
    console.log('verifyRetryPayment called with orderId:', orderId, 'userId:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId in verifyRetryPayment, redirecting to login');
      return res.status(401).json({
        success: false,
        message: 'Please log in to verify payment.',
        redirect: '/login'
      });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      console.error('Invalid order ID in verifyRetryPayment:', orderId);
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      console.log('Order not found in verifyRetryPayment:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, {
        status: 'Processing',
        paymentFailedStatus: false,
        razorpayPaymentId: razorpay_payment_id,
        orderType: 'razorPay',
        'orderedItems.$[].status': 'Processing',
      });
      return res.json({ 
        success: true, 
        redirect: `/orderSuccess?orderId=${orderId}` 
      });
    } else {
      await Order.findByIdAndUpdate(orderId, { 
        status: 'payment failed', 
        paymentFailedStatus: true,
        cancellationReason: 'Invalid payment signature on retry' 
      });
      return res.json({ 
        success: false, 
        message: 'Invalid payment signature.', 
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Invalid payment signature.')}&errorCode=INVALID_SIGNATURE`
      });
    }
  } catch (error) {
    console.error('Verify retry payment error:', error);
    const orderId = req.body.orderId;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      await Order.findByIdAndUpdate(orderId, { 
        status: 'payment failed',
        paymentFailedStatus: true,
        cancellationReason: 'Payment verification failed on retry'
      });
      return res.json({ 
        success: false, 
        message: 'Unable to verify payment.', 
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`
      });
    }
    return res.json({
      success: false,
      message: 'Unable to verify payment. Invalid order ID.',
      redirect: `/orders?message=${encodeURIComponent('Payment verification failed.')}&errorCode=INVALID_ORDER_ID`
    });
  }
};


const checkStockAvailability = async (req, res) => {
  try {
    const { cartId } = req.body;

    // Fetch the cart
    const cart = await Cart.findById(cartId).populate('items.productId');
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found',
      });
    }

    // Check stock for each item
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        return res.status(400).json({
          success: false,
          message: `Product ${product.productName} is not available`,
        });
      }

      // Find the variant matching the size in the cart
      const variant = product.variants.find(v => v.size === item.size);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} for ${product.productName} is not available`,
        });
      }

      // Check if sufficient quantity is available
      if (variant.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName} (${item.size}). Available: ${variant.quantity}, Requested: ${item.quantity}`,
        });
      }
    }

    // All items have sufficient stock
    return res.status(200).json({
      success: true,
      message: 'All items are in stock',
    });
  } catch (error) {
    console.error('Stock check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking stock availability',
    });
  }
};




module.exports = {
  addToCart,
  productQuantity,
  cart,
  cartQuantityCheck,
  deleteFromCart,
  checkOut,
  applyCoupon,
  removeCoupon,
  cod,
  orderSuccess,
  checkoutRazorpay,
  verifyPayment,
  orderFailed,
  checkoutWallet,
  retryRazorpayPayment,
  verifyRetryPayment,
  checkStockAvailability
}
