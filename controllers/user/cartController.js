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
    const userId = req.session.user;
    const { size, quantity, productId, flag } = req.query;

    console.log(req.query);
    
    const MAX_CART_QUANTITY = 5; // Configurable maximum quantity

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (flag === "1") {
      // Remove item from wishlist if adding from there
      const wishlist = await Wishlist.findOne({ userId });
      if (wishlist) {
        const productIndex = wishlist.items.findIndex(
          (item) => item.product.toString() === productId.toString()
        );
        if (productIndex !== -1) {
          wishlist.items.splice(productIndex, 1);
          await wishlist.save();
        }
      }
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
      isDeleted: false,
    }).populate({
      path: "category",
      match: { isListed: true, isDeleted: false },
      select: "_id name isBlocked isListed"
    });

    if (!product || !product.category || product.category.isListed === false || product.category.isDeleted===true)
      {
      
      return res.status(404).json({
        success: false,
        message: "Product is Unavailable",
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

    // Check available stock
    const availableStock = variant.quantity;
    let cart = await Cart.findOne({ userId });

    // Check if the item already exists in the cart
    let existingQuantity = 0;
    if (cart) {
      const itemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId && item.size === size
      );
      if (itemIndex !== -1) {
        existingQuantity = cart.items[itemIndex].quantity;
      }
    }

    // Validate maximum cart quantity
    const totalRequestedQuantity = existingQuantity + qty;
    if (totalRequestedQuantity > MAX_CART_QUANTITY) {
      return res.status(400).json({
        success: false,
        message: `You can add a maximum of ${MAX_CART_QUANTITY} items. You already have ${existingQuantity} in your cart.`,
      });
    }

    // Validate stock
    if (totalRequestedQuantity > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock - existingQuantity} more items can be added. You already have ${existingQuantity} in your cart.`,
      });
    }

    const price = variant.salePrice;
    const totalPrice = qty * price;

    if (!cart) {
      // Create new cart if none exists
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
        // Update existing item
        cart.items[itemIndex].quantity = totalRequestedQuantity;
        cart.items[itemIndex].totalPrice = cart.items[itemIndex].quantity * price;
      } else {
        // Add new item
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
      discountedPrice: variantPrice ? parseFloat(variantPrice.toFixed(2)) : 0,
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
      discountedPrice = Math.max(variantPrice - discount, 0);
    }
  }

  return {
    bestOffer,
    discountAmount: parseFloat(maxDiscount.toFixed(2)),
    offerPercentage: parseFloat(offerPercentage.toFixed(0)),
    discountedPrice: parseFloat(discountedPrice.toFixed(2)),
  };
};

// Render cart page
const cart = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).send('Unauthorized. Please log in.');
    }

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
          total: '0.00',
          shipping: '0.00',
          discount: '0.00',
          offerDiscount: '0.00',
          grandTotal: '0.00',
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
        }).populate({path:"category",match:{isDeleted:false,isListed:true}})

        if (!product || !product.category) {
          console.log(`Product not found for productId: ${item.productId}`);
          return null;
        }

        const variant = product.variants.find((v) => v.size === item.size);
        if (!variant) {
          console.log(`Variant not found for productId: ${item.productId}, size: ${item.size}`);
          return {
            ...product.toObject(),
            cartItemId: item._id,
            selectedSize: item.size,
            cartQuantity: item.quantity,
            cartPrice: item.price,
            cartTotalPrice: item.totalPrice,
            status: 'out of stock',
            variantQuantity: 0,
            bestOffer: null,
            discountAmount: 0,
            offerPercentage: 0,
            discountedPrice: parseFloat(item.price.toFixed(2)),
            originalPrice: parseFloat(item.price.toFixed(2)),
          };
        }

        const variantPrice = variant.salePrice
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
            discountedPrice: parseFloat(item.price.toFixed(2)),
            originalPrice: parseFloat(item.price.toFixed(2)),
          };
        }

        if (variant.quantity === 0) {
          console.log(`Item out of stock: productId: ${item.productId}, size: ${item.size}`);
          // Don't change quantity; just mark as out of stock in the returned product
        } else if (item.quantity > variant.quantity) {
          console.log(`Adjusted cart quantity for productId: ${item.productId}, size: ${item.size} to ${variant.quantity} due to stock limit`);
          item.quantity = variant.quantity; // Only adjust if > 0
        }
                
        
        

        const isOutOfStock =
          product.status === 'out of stock' ||
          product.isBlocked ||
          !product.isListed ||
          product.isDeleted ||
          !variant ||
          variant.quantity === 0;

        const { bestOffer, discountAmount, offerPercentage, discountedPrice } = await getBestOfferForItem(
          product,
          variantPrice
        );

        // Update cart item price if outdated
        if (item.price !== discountedPrice || item.totalPrice !== discountedPrice * item.quantity) {
          item.price = parseFloat(discountedPrice.toFixed(2));
          item.totalPrice = parseFloat((discountedPrice * item.quantity).toFixed(2));
        }

        return {
          ...product.toObject(),
          cartItemId: item._id,
          selectedSize: item.size,
          cartQuantity: item.quantity,
          cartPrice: parseFloat(item.price.toFixed(2)),
          cartTotalPrice: parseFloat(item.totalPrice.toFixed(2)),
          status: isOutOfStock ? 'out of stock' : product.status,
          variantQuantity: variant.quantity,
          bestOffer,
          discountAmount: parseFloat(discountAmount.toFixed(2)) * item.quantity,
          offerPercentage,
          discountedPrice: parseFloat(discountedPrice.toFixed(2)),
          originalPrice: parseFloat(variantPrice.toFixed(2)),
        };
      })
    );

    await cart.save(); // Save any updated cart item prices or quantities

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
        orderSummary.total += product.originalPrice * product.cartQuantity;
        orderSummary.offerDiscount += product.discountAmount;
      }
    });

    orderSummary.discount = orderSummary.offerDiscount + (cart.discount || 0);
    orderSummary.grandTotal = Math.max(orderSummary.total - orderSummary.discount, 0);

    res.render('cart', {
      user,
      cart,
      products: validProducts,
      empty: validProducts.length === 0,
      orderSummary: {
        total: parseFloat(orderSummary.total.toFixed(2)),
        shipping: parseFloat(orderSummary.shipping.toFixed(2)),
        discount: parseFloat(orderSummary.discount.toFixed(2)),
        offerDiscount: parseFloat(orderSummary.offerDiscount.toFixed(2)),
        grandTotal: parseFloat(orderSummary.grandTotal.toFixed(2)),
      },
      coupons,
    });
  } catch (error) {
    console.error('Cart error:', error);
    res.status(500).send('Something went wrong while loading your cart.');
  }
};

// Check and update cart item quantity
const cartQuantityCheck = async (req, res) => {
  try {
    const { productId, size, quantity, action } = req.body;
    const userId = req.session.user;

    // Input validation
    if (!productId || !size || !quantity || !action) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, size, quantity, and action are required',
      });
    }

    const newQuantity = parseInt(quantity);
     

    
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

    if (product.status === 'out of stock' || product.isBlocked || !product.isListed || product.isDeleted) {
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

    // Validate quantity based on action
    if (action === 'increase') {
      if (variant.quantity === 0) {
        return res.status(400).json({
          success: false,
          message: `No stock available for ${product.productName} (${size})`,
        });
      }
      if (newQuantity > variant.quantity) {
        return res.status(400).json({
          success: false,
          message: `Quantity cannot exceed ${variant.quantity} for ${product.productName} (${size})`,
        });
      }
    } else if (action === 'decrease') {
      if (newQuantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity cannot be less than 1',
        });
      }
    }

    // Update quantity
    cartItem.quantity = newQuantity;

    // Get base price and best offer
    const variantPrice = variant.salePrice > 0 ? variant.salePrice : variant.regularPrice;
    const { bestOffer, discountAmount, offerPercentage, discountedPrice } = await getBestOfferForItem(
      product,
      variantPrice
    );

    // Update cart item
    cartItem.price = parseFloat(discountedPrice.toFixed(2));
    cartItem.totalPrice = parseFloat((discountedPrice * newQuantity).toFixed(2));

    await cart.save();

    // Calculate order summary
    let orderSummary = {
      total: 0,
      shipping: 0,
      discount: 0,
      offerDiscount: 0,
      grandTotal: 0,
    };

    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const variant = product.variants.find((v) => v.size === item.size);
        const isOutOfStock =
          product.status === 'out of stock' ||
          product.isBlocked ||
          !product.isListed ||
          product.isDeleted ||
          !variant ||
          variant.quantity === 0;
        if (!isOutOfStock) {
          const itemVariantPrice = variant.salePrice > 0 ? variant.salePrice : variant.regularPrice;
          const { discountAmount: itemDiscount } = await getBestOfferForItem(product, itemVariantPrice);
          orderSummary.total += itemVariantPrice * item.quantity;
          orderSummary.offerDiscount += parseFloat(itemDiscount.toFixed(2)) * item.quantity;
        }
      }
    }

    orderSummary.discount = orderSummary.offerDiscount + (cart.discount || 0);
    orderSummary.grandTotal = Math.max(orderSummary.total - orderSummary.discount, 0);

    // Return response
    return res.status(200).json({
      success: true,
      message: 'Quantity updated successfully',
      quantity: cartItem.quantity,
      subtotal: cartItem.totalPrice.toFixed(2),
      offerPercentage,
      discountedPrice: parseFloat(discountedPrice.toFixed(2)),
      originalPrice: parseFloat(variantPrice.toFixed(2)),
      orderSummary: {
        total: parseFloat(orderSummary.total.toFixed(2)),
        shipping: parseFloat(orderSummary.shipping.toFixed(2)),
        discount: parseFloat(orderSummary.discount.toFixed(2)),
        offerDiscount: parseFloat(orderSummary.offerDiscount.toFixed(2)),
        grandTotal: parseFloat(orderSummary.grandTotal.toFixed(2)),
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
    const wallet = await Wallet.findOne({ userId });

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
        wallet,
      });
    }

    // Prepare products
    let subtotal = 0;
    let savings = 0;
    let validProducts = [];
    const updatedCartItems = [];

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const product = await Product.findOne({
        _id: item.productId,
        isBlocked: false,
        isDeleted: false,
        isListed: true, // Added to align with product schema
      }).populate({
        path: 'category',
        match: { isListed: true, isDeleted: false },
        select: '_id name',
      });

      if (!product || !product.category) {
        continue; // Skip if product or category is invalid
      }

      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0 || product.status === 'out of stock') {
        continue; // Skip if variant is invalid or out of stock
      }

      // Calculate price
      const salePrice = variant.salePrice;
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

      // Update cart item
      updatedCartItems.push({
        productId: item.productId,
        size: item.size,
        quantity: updatedQuantity,
        price: offerPrice,
        totalPrice: itemTotal,
        status: item.status,
        cancellationReason: item.cancellationReason,
      });

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
      cart.items = []; // Clear cart if no valid products
      await cart.save();
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
        wallet,
      });
    }

    // Update cart with valid items
    cart.items = updatedCartItems;
    await cart.save();

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
      wallet,
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
      wallet: null,
    });
  }
};




const applyCoupon = async (req, res) => {
  try {
    const userId = req.session.user;
    const { couponCode } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Please log in to apply a coupon.' });
    }

    if (!couponCode || typeof couponCode !== 'string') {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || !cart.items.length) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
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
      return res.status(400).json({ success: false, message: 'Invalid or expired coupon code.' });
    }

    const cartTotalAfterSavings = subtotal - savings;
    if (cartTotalAfterSavings < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Cart total must be at least ₹${coupon.minimumPrice} after discounts to apply this coupon.`,
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
    res.status(500).json({ success: false, message: 'Unable to apply coupon due to a server error.' });
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

const placeOrder = async (req, res, orderStatus = 'Pending') => {
  try {
    const userId = req.session.user;
    const { cartId, address, payment, couponCode } = req.body;

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Please log in.');
    }

    // Validate cartId
    if (!cartId || !mongoose.Types.ObjectId.isValid(cartId)) {
      throw new Error('Invalid cart ID.');
    }

    const user = await User.findById(userId);
    const cart = await Cart.findById(cartId).populate('items.productId');
    const addressDoc = await Address.findOne({ userId });

    if (!user) {
      throw new Error('User not found.');
    }
    if (!cart) {
      throw new Error('Cart not found.');
    }
    if (!cart.items.length) {
      throw new Error('Cart is empty.');
    }

    // Validate address
    const selectedAddress = addressDoc?.address.find((addr) => addr._id.equals(address));
    if (!selectedAddress) {
      throw new Error('Invalid address selected.');
    }

    // Prepare order items
    let subtotal = 0;
    let offerDiscount = 0;
    const orderedItems = [];
    for (const item of cart.items) {
      const product = item.productId;
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        continue;
      }
      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity === 0) {
        continue;
      }
      if (variant.quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${product.productName} (${item.size}ml). Available: ${variant.quantity}`
        );
      }
      const salePrice = variant.salePrice || variant.regularPrice;

      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category },
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
        quantity: item.quantity,
        price: offerPrice,
        status: orderStatus,
      });

      subtotal += salePrice * item.quantity;
      offerDiscount += maxDiscount * item.quantity;

      // Decrease stock only for successful orders
      if (orderStatus === 'Pending') {
        variant.quantity -= item.quantity;
        await product.save();
      }
    }

    if (orderedItems.length === 0) {
      throw new Error('No valid items to order.');
    }

    // Apply coupon
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
      wallet: 'wallet',
    };
    const orderType = orderTypeMap[payment];
    if (!orderType) {
      throw new Error('Invalid payment method.');
    }

    

    // Generate unique orderId
    let orderId;
    let isUnique = false;
    while (!isUnique) {
      orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
      razorpayOrderId: '',
      orderType,
      status: orderStatus,
      couponApplied,
      createdOn: new Date(),
      couponCode: couponApplied ? couponCode : undefined,
    });

    // Update User.OrderHistory and clear cart
    if (orderStatus === 'Pending') {
      await User.findByIdAndUpdate(userId, {
        $push: { OrderHistory: order._id },
      });
      cart.items = [];
      await cart.save();
    }

    req.session.appliedCoupon = null;

    return order;
  } catch (error) {
    console.error('Place order error:', error);
    throw error;
  }
};

const cod = async (req, res) => {//cash on delevery
  try {
    console.log(req.body);
    
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
    const userId = req.session.user;
    const { cartId, address, couponCode } = req.body;
    console.log(cartId, address, couponCode, '=======================================================1');

    // Validate inputs
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Please log in.',
        errorCode: 'AUTH_REQUIRED',
      });
    }
    if (!cartId || !address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        errorCode: 'MISSING_FIELDS',
      });
    }

    // Fetch cart with correct population
    console.log('Fetching cart with ID:', cartId);
    const cart = await Cart.findById(cartId).populate('items.productId');
    console.log('Cart fetched:', cart);
    if (!cart || cart.userId.toString() !== userId.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or unauthorized',
        errorCode: 'CART_NOT_FOUND',
      });
    }

    // Validate cart items
    if (!cart.items.length) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
        errorCode: 'EMPTY_CART',
      });
    }

    // Validate address
    const addressDoc = await Address.findOne({ userId });
    const selectedAddress = addressDoc?.address.find((addr) => addr._id.equals(address));
    if (!selectedAddress) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address selected',
        errorCode: 'INVALID_ADDRESS',
      });
    }

    // Calculate totals and apply offers
    let subtotal = 0;
    let offerDiscount = 0;

    for (const item of cart.items) {
      const product = item.productId;
      if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
        return res.status(400).json({
          success: false,
          message: `Product ${product?.productName || 'unknown'} is unavailable`,
          errorCode: 'PRODUCT_UNAVAILABLE',
        });
      }

      const variant = product.variants.find((v) => v.size === item.size);
      if (!variant || variant.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.productName} (${item.size})`,
          errorCode: 'INSUFFICIENT_STOCK',
        });
      }

      const salePrice = variant.salePrice || variant.regularPrice;

      // Fetch applicable offers
      const offers = await Offer.find({
        $or: [
          { offerType: 'Product', applicableTo: product._id },
          { offerType: 'Category', applicableTo: product.category },
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
        let discount = offer.discountAmount * (offer.discountType === 'percentage' ? salePrice / 100 : 1);
        if (discount > maxDiscount) {
          maxDiscount = discount;
          offerPrice = Math.max(0, salePrice - discount);
        }
      });

      subtotal += salePrice * item.quantity;
      offerDiscount += maxDiscount * item.quantity;
    }

    // Apply coupon
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({
        couponCode,
        isListed: true,
        isDeleted: false,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
        $or: [{ userId: { $exists: false } }, { userId }],
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired coupon',
          errorCode: 'INVALID_COUPON',
        });
      }

      if (subtotal - offerDiscount < coupon.minimumPrice) {
        return res.status(400).json({
          success: false,
          message: `Order amount must be at least ₹${coupon.minimumPrice} to use this coupon`,
          errorCode: 'COUPON_MIN_AMOUNT',
        });
      }

      couponDiscount = coupon.offerPrice;
    }

    const finalAmount = Math.max(0, subtotal - offerDiscount - couponDiscount);
    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order amount after discounts',
        errorCode: 'INVALID_AMOUNT',
      });
    }

    // Convert to paise
    const amount = Math.round(finalAmount * 100);
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least ₹1',
        errorCode: 'MIN_AMOUNT_ERROR',
      });
    }

    // Create Razorpay order
    const options = {
      amount,
      currency: 'INR',
      receipt: `temp_${cartId}`,
    };

    console.log('Razorpay options:', options);

    const razorpayOrder = await razorpay.orders.create(options);
    console.log('Razorpay order created:', razorpayOrder);

    // Store order details in session
    req.session.pendingOrder = {
      cartId,
      address,
      couponCode,
      finalAmount,
      razorpayOrderId: razorpayOrder.id,
    };

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      cartId,
      address,
      couponCode,
    });
  } catch (error) {
    console.error('Razorpay checkout error:', error);

    if (res.headersSent) {
      return;
    }

    if (error.path === 'items.product') {
      return res.status(500).json({
        success: false,
        message: "Invalid population path in schema. Expected 'items.productId'.",
        errorCode: 'SCHEMA_POPULATE_ERROR',
        errorDetails: error.message,
      });
    }

    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Razorpay credentials',
        errorCode: 'RAZORPAY_AUTH_ERROR',
      });
    }

    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.error?.description || 'Invalid request to Razorpay',
        errorCode: 'RAZORPAY_VALIDATION_ERROR',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to initiate Razorpay payment.',
      errorCode: 'PAYMENT_INIT_FAILED',
      errorDetails: error.message || 'Unknown error occurred',
    });
  }
};




const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, cartId, address, couponCode } = req.body;
    const pendingOrder = req.session.pendingOrder || { cartId, address, couponCode };

    console.log('VerifyPayment received:', { razorpay_payment_id, razorpay_order_id, pendingOrder });

    // Validate inputs
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !pendingOrder.cartId || !pendingOrder.address) {
      // Create failed order due to missing details
      const failedOrder = await placeOrder(
        {
          ...req,
          body: {
            cartId: pendingOrder?.cartId,
            address: pendingOrder?.address,
            payment: 'razorpay',
            couponCode: pendingOrder?.couponCode,
          },
          session: req.session,
        },
        res,
        'Payment failed'
      );

      // Update order with payment details
      await Order.findByIdAndUpdate(failedOrder._id, {
        status: 'Payment failed',
        paymentId: razorpay_payment_id || null,
        razorpayOrderId: razorpay_order_id || null,
        orderType: 'razorPay',
        cancellationReason: 'Missing required payment details or pending order',
      });

      // Clear pending order from session
      delete req.session.pendingOrder;

      return res.status(400).json({
        success: false,
        message: 'Missing required payment details or pending order',
        errorCode: 'MISSING_PAYMENT_DETAILS',
        orderId: failedOrder._id,
      });
    }

    // Verify payment signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment verified, place the order
      const order = await placeOrder(
        {
          ...req,
          body: {
            cartId: pendingOrder.cartId,
            address: pendingOrder.address,
            payment: 'razorpay',
            couponCode: pendingOrder.couponCode,
          },
          session: req.session,
        },
        res,
        'Pending'
      );

      // Update order with payment details
      await Order.findByIdAndUpdate(order._id, {
        status: 'Pending',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderType: 'razorPay',
      });

      // Clear pending order from session
      delete req.session.pendingOrder;

      return res.json({
        success: true,
        message: 'Payment verified and order placed successfully.',
        orderId: order._id,
      });
    } else {
      // Invalid signature, create failed order
      const failedOrder = await placeOrder(
        {
          ...req,
          body: {
            cartId: pendingOrder.cartId,
            address: pendingOrder.address,
            payment: 'razorpay',
            couponCode: pendingOrder.couponCode,
          },
          session: req.session,
        },
        res,
        'Payment failed'
      );

      // Update order with payment details
      await Order.findByIdAndUpdate(failedOrder._id, {
        status: 'Payment failed',
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderType: 'razorPay',
        cancellationReason: 'Invalid payment signature',
      });

      // Clear pending order from session
      delete req.session.pendingOrder;

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature, your payment could not be verified.',
        errorCode: 'INVALID_SIGNATURE',
        orderId: failedOrder._id,
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);

    // Create failed order due to error
    const pendingOrder = req.session.pendingOrder || { cartId: req.body.cartId, address: req.body.address, couponCode: req.body.couponCode };
    let failedOrder;
    if (pendingOrder.cartId && pendingOrder.address) {
      failedOrder = await placeOrder(
        {
          ...req,
          body: {
            cartId: pendingOrder.cartId,
            address: pendingOrder.address,
            payment: 'razorpay',
            couponCode: pendingOrder.couponCode,
          },
          session: req.session,
        },
        res,
        'Payment failed'
      );

      // Update order with error details
      await Order.findByIdAndUpdate(failedOrder._id, {
        status: 'Payment failed',
        paymentId: req.body.razorpay_payment_id || null,
        razorpayOrderId: req.body.razorpay_order_id || null,
        orderType: 'razorPay',
        cancellationReason: error.message || 'Payment verification failed',
      });
    }

    // Clear pending order from session
    delete req.session.pendingOrder;

    return res.status(500).json({
      success: false,
      message: error.message || 'Unable to verify payment.',
      errorCode: 'PAYMENT_VERIFICATION_FAILED',
      orderId: failedOrder?._id || null,
    });
  }
};


const orderSuccess = async (req, res) => {
  try {
    const orderId = req.query.orderId; // Adjust based on your route
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      throw new Error("Invalid order ID.");
    }

    const order = await Order.findById(orderId).populate("orderedItems.product");
    if (!order) {
      throw new Error("Order not found.");
    }

    const user = req.session.user ? await User.findById(req.session.user) : null;

    res.render("orderSuccess", {
      order,
      user,
      title: "Order Success",
    });
  } catch (error) {
    console.error("Error loading order success page:", error);
    res.redirect("/order-failed");
  }
};

const orderFailed = async (req, res) => {
  try {
    const user = req.session.user ? await User.findById(req.session.user) : null;
    const errorCode = req.query.errorCode || 'UNKNOWN_ERROR';
    const message = req.query.message || 'An error occurred during payment processing.';
    const orderId = req.query.orderId || null;

    console.log('Rendering orderFailed with:', { user, errorCode, message, orderId });

    let order = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId).populate('orderedItems.product');
    }

    res.render('orderFailed', {
      user,
      title: 'Order Failed',
      errorCode,
      message,
      orderId,
      order,
    });
  } catch (error) {
    console.error('Error loading order failed page:', error);
    res.render('orderFailed', {
      user: null,
      title: 'Order Failed',
      errorCode: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
      orderId: null,
      order: null,
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
        orderId:order._id,
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

    console.log('retryRazorpayPayment called with orderId:', orderId, 'userId:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Please log in to retry payment.' });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    // Validate order ownership
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not authorized.' });
    }

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
    console.log('Razorpay order created:', razorpayOrder);

    await Order.findByIdAndUpdate(orderId, { razorpayOrderId: razorpayOrder.id });

    return res.json({
      success: true,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: order.finalAmount,
      razorpayKey: process.env.RAZORPAY_KEY_ID, // Send key from server
    });
  } catch (error) {
    console.error('Retry Razorpay payment error:', error);
    return res.status(500).json({ success: false, message: 'Unable to initiate retry payment.' });
  }
};

const verifyRetryPayment = async (req, res) => {
  try {
    const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.session.user;

    console.log('verifyRetryPayment called with orderId:', orderId, 'userId:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId in verifyRetryPayment, redirecting to login');
      return res.status(401).json({
        success: false,
        message: 'Please log in to verify payment.',
        redirect: '/login',
      });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      console.error('Invalid order ID in verifyRetryPayment:', orderId);
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`,
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      console.log('Order not found in verifyRetryPayment:', orderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`,
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      await Order.findByIdAndUpdate(orderId, {
        status: 'Pending',
        paymentFailedStatus: false,
        razorpayPaymentId: razorpay_payment_id,
        orderType: 'razorPay',
        'orderedItems.$[].status': 'Pending',
      });
      return res.json({
        success: true,
        redirect: `/orderSuccess?orderId=${orderId}`,
      });
    } else {
      await Order.findByIdAndUpdate(orderId, {
        status: 'Payment failed',
        paymentFailedStatus: true,
        cancellationReason: 'Invalid payment signature on retry',
      });
      return res.json({
        success: false,
        message: 'Invalid payment signature.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Invalid payment signature.')}&errorCode=INVALID_SIGNATURE`,
      });
    }
  } catch (error) {
    console.error('Verify retry payment error:', error);
    const orderId = req.body.orderId;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      await Order.findByIdAndUpdate(orderId, {
        status: 'Payment failed',
        paymentFailedStatus: true,
        cancellationReason: 'Payment verification failed on retry',
      });
      return res.json({
        success: false,
        message: 'Unable to verify payment.',
        redirect: `/orderFailed?orderId=${orderId}&message=${encodeURIComponent('Unable to verify payment.')}&errorCode=PAYMENT_VERIFICATION_FAILED`,
      });
    }
    return res.json({
      success: false,
      message: 'Unable to verify payment. Invalid order ID.',
      redirect: `/orders?message=${encodeURIComponent('Payment verification failed.')}&errorCode=INVALID_ORDER_ID`,
    });
  }
};


const updateFailedPayment = async (req, res) => {
  try {
    const { orderId, errorCode, errorDescription } = req.body;
    const userId = req.session.user;

    console.log('updateFailedPayment called with orderId:', orderId, 'userId:', userId);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Please log in.' });
    }

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID.' });
    }

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not authorized.' });
    }

    // Update order status to reflect the failed payment
    await Order.findByIdAndUpdate(orderId, {
      status: 'Payment failed',
      paymentFailedStatus: true,
      cancellationReason: `Payment failed: ${errorDescription}`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating failed payment:', error);
    return res.status(500).json({ success: false, message: 'Unable to update failed payment.' });
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
  updateFailedPayment,
  orderFailed,
  checkoutWallet,
  retryRazorpayPayment,
  verifyRetryPayment,
  checkStockAvailability
}
