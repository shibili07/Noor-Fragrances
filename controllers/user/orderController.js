const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Offer= require("../../models/offerSchema");
const Wallet = require('../../models/walletSchema'); // Adjust path as needed
const Coupon = require("../../models/couponSchema");




const myOrders = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).render('myOrders', {
          orders: [],
          user: null,
          error: 'User not found.',
        });
      }
  
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = 6; // 6 orders per page
      const skip = (page - 1) * limit;
  
      // Get total count of orders
      const totalOrders = await Order.countDocuments({ userId });
      const totalPages = Math.ceil(totalOrders / limit);
  
      const orders = await Order.find({ userId })
        .populate({
          path: 'orderedItems.product',
          select: 'productName productImage',
          match: { isDeleted: false, isListed: true }, 
        })
        .sort({ createdOn: -1 })
        .skip(skip)
        .limit(limit);
  
      const formattedOrders = orders
        .filter((order) => order && order.orderedItems.length > 0)
        .map((order) => ({
          _id: order._id,
          orderId: order.orderId,
          orderDate: order.createdOn,
          status: order.status,
          orderType: order.orderType,
          totalAmount: order.finalAmount,
          products: order.orderedItems
            .filter((item) => item.product)
            .map((item, index) => ({
              index,
              name: item.name || item.product.productName || 'Unknown Product',
              image:
                Array.isArray(item.product.productImage) && item.product.productImage.length > 0
                  ? item.product.productImage[0]
                  : 'fallback.jpg',
              quantity: item.quantity,
              price: item.price,
              status: item.status,
              cancellationReason: item.cancellationReason || null,
              canCancel: ['Pending', 'Proccessing'].includes(item.status)
            }))
        }));
  
      res.render('myOrders', {
        orders: formattedOrders,
        user,
        error: null,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).render('myOrders', {
        orders: [],
        user: null,
        error: 'Unable to fetch orders. Please try again later.',
      });
    }
  };
  
  
  
  
  const getOrderDetails = async (req, res) => {
    try {
      const userId = req.session.user;
      const { id } = req.params;
  
      const userData = await User.findById(userId);
  
      const order = await Order.findById(id)
        .populate("orderedItems.product");
  
      if (!order) {
        return res.status(404).send("Order not found");
      }
  
      if (order.userId.toString() !== userId.toString()) {
        return res.status(403).send("Unauthorized");
      }
      const address = order?.address
      return res.render("orderDetails", {
        user: userData,
        order,
        address
      });
  
    } catch (err) {
      console.error(err);
<<<<<<< HEAD
      res.status(500).send("Internal Server Error");
=======
      return res.redirect("/serverError")
>>>>>>> d96c03c (Recovered from local corruption)
    }
  };
  

  //refund amount 
  
  async function refundToWallet(orderId,userId, amount, description = "Order refund") {
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
    }
    wallet.balance += amount;
    wallet.transactions.push({
      orderId,
      amount: amount,
      type: "Credit",
      method: "Refund",
      status: "Completed",
      description,
      date: new Date()
    });
    wallet.lastUpdated = new Date();
    await wallet.save();
  }
  
  
  const cancelOrder = async (req, res) => {
    try {
      const { id } = req.params; 
      const { reason } = req.body; 
  
      if (!id || !reason) {
        return res.status(400).json({
          success: false, 
          message: "Order ID and cancellation reason are required."
        });
      }
  
      const order = await Order.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false, 
          message: "Order not found."
        });
      }
      if (order.status === 'Cancelled' || order.status === 'Delivered' || order.status === 'Returned') {
        return res.status(400).json({
          success: false,
          message: "This order cannot be cancelled in its current state."
        });
      }
  
      // Mark all items as cancelled
      order.orderedItems.forEach(item => {
        item.status = 'Cancelled';
        item.cancellationReason = reason;
      });
  
      const allItemsCancelled = order.orderedItems.every(item => item.status === 'Cancelled');
      if (allItemsCancelled) {
        order.status = 'Cancelled';
      
        for (const item of order.orderedItems) {
          const product = await Product.findById(item.product);
          if (product) {
            const variant = product.variants.find((v) => v.sku === item.sku);
            if (variant) {
              variant.quantity += item.quantity;
              if (product.status === 'out of stock' && variant.quantity > 0) {
                product.status = 'Available';
              }
              await product.save();
            }
          }
        }
      }


      if (order.orderType === 'razorPay' || order.orderType === 'wallet') {
        let totalRefund = order.finalAmount;
        if (totalRefund > 0) {
          await refundToWallet(order._id,order.userId, totalRefund, `Refund for cancelled order ${order.orderId}`);
        }
      }
      order.offerDiscount=0.00;
      order.totalPrice = 0.00;
      order.finalAmount = 0.00;
      order.couponDiscount =0.00;
      await order.save(); 
  
      // --- Proper refund logic ---
     
  
      return res.status(200).json({
        success: true, 
        message: "Order cancelled successfully.", 
        order
      });



    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error."
      });
    }
  };
  
  


  
  const productCancelOrder = async (req, res) => {
    try {
      const { reason, orderId, productId, sku } = req.body;

      
  
      if (!orderId || !productId || !reason || !sku) {
        return res.status(400).json({
          success: false,
          message: 'Order ID, product ID, SKU, and reason are required',
        });
      }
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
      

      const cancellingproduct = await Product.findOne({ _id: productId });
      if (!cancellingproduct) {
        throw new Error('Product not found');
      }
      const verProduct = cancellingproduct.variants.find((v) => v.sku === sku);
      if (!verProduct) {
        throw new Error('Product variant not found');
      }
      
      const item = order.orderedItems.find((o) => o.product.toString() === productId && o.sku === sku);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in this order',
        });
      }

      const couponCode =order.couponCode

      if(couponCode){
        const coupon = await Coupon.findOne({couponCode})
      }
        
      item.status = 'Cancelled';
      item.cancellationReason = reason;
      
      // Find applicable offers for both product and category
      const product = await Product.findById(item.product).populate('category');
      const offers = await Offer.find({
        $or: [
          { 
            applicableTo: item.product,
            offerTypeRef: 'Product'
          },
          { 
            applicableTo: product.category._id,
            offerTypeRef: 'Category'
          }
        ],
        isListed: true,
        isDeleted: false,
        validFrom: { $lte: new Date() },
        validUpto: { $gte: new Date() }
      });
      
      console.log("Found Offers:", offers);
      
    
      let bestOffer = null;
      let maxDiscount = 0;
      
      for (const offer of offers) {
        let discount = 0;
        if (offer.discountType === 'percentage') {
          const actualPrice = verProduct.salePrice * item.quantity;
          discount = actualPrice * (offer.discountAmount / 100);
        } else if (offer.discountType === 'flat') {
          discount = offer.discountAmount;
        }
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestOffer = offer;
        }
      }
      
      console.log("Best Offer:", bestOffer, "Max Discount:", maxDiscount);
      
      const price = item.price;
      const quantity = item.quantity;
      const amount = quantity * price;
      const offerDiscount = maxDiscount;
  
      
      const actualPrice = verProduct.salePrice * quantity;
      order.totalPrice -= actualPrice;
     
     
      order.finalAmount -= (actualPrice - offerDiscount);
      order.offerDiscount -= offerDiscount;
      
      console.log("Order Offer Discount Before:", order.offerDiscount, "Item Offer Discount:", offerDiscount);
      
      if (order.offerDiscount < 0) order.offerDiscount = 0;
      
      console.log("Order Offer Discount After:", order.offerDiscount);

      // Check and adjust coupon if applied
      if (order.couponApplied && order.couponCode) {
        const coupon = await Coupon.findOne({ couponCode: order.couponCode });
        if (coupon) {
          // Calculate remaining order amount after cancellation
          const remainingAmount = order.totalPrice - order.offerDiscount;
          console.log("Remaining amount after cancellation:", remainingAmount);
          console.log("Coupon minimum price:", coupon.minimumPrice);
          
          // If remaining amount is less than coupon's minimum price
          if (remainingAmount < coupon.minimumPrice) {
            console.log("Removing coupon as remaining amount is below minimum");
            
            // Add back the coupon discount to final amount
            order.finalAmount += order.couponDiscount;
            
            // If it's a RazorPay order, adjust the refund amount
            if (order.orderType === 'razorPay' || order.orderType === 'wallet') {
              // Calculate the refund amount for the cancelled product
              const refundAmount = actualPrice - offerDiscount;
              console.log("Original refund amount:", refundAmount);
              
              // If coupon is being removed, adjust the refund
              const adjustedRefund = refundAmount - order.couponDiscount;
              console.log("Adjusted refund amount:", adjustedRefund);
              
              if (adjustedRefund > 0) {
                await refundToWallet(
                  order._id,
                  order.userId, 
                  adjustedRefund, 
                  `Refund for cancelled product in order ${order.orderId} (coupon adjusted)`
                );
              }
            }
            
            // Reset coupon related fields
            order.couponDiscount = 0;
            order.couponApplied = false;
            order.couponCode = null;
            
            console.log("Coupon removed. New final amount:", order.finalAmount);
          }
        }
      } else if (order.orderType === 'razorPay' || order.orderType === 'wallet') {
        // Handle refund for orders without coupon
        const refundAmount = actualPrice - offerDiscount;
        console.log("Refund amount without coupon:", refundAmount);
        
        if (refundAmount > 0) {
          await refundToWallet(
            order._id,
            order.userId,
            refundAmount,
            `Refund for cancelled product in order ${order.orderId}`
          );
        }
      }

      // Update product variant quantity
      verProduct.quantity += item.quantity;
      if (cancellingproduct.status === 'out of stock' && verProduct.quantity > 0) {
        cancellingproduct.status = 'Available';
      }
      await cancellingproduct.save();
  
      const allItemsCancelled = order.orderedItems.every((item) => item.status === 'Cancelled');
      if (allItemsCancelled) {
        order.status = 'Cancelled';
      }
      await order.save();
  
      return res.status(200).json({
        success: true,
        message: 'Product cancelled successfully',
      });
    } catch (error) {
      console.error('Error in productCancelOrder:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
  
  

  
  const productReturnOrder = async(req,res)=>{
    try {
      console.log(req.body);
     
      const { orderId, productId, sku, reason } = req.body;
      const order = await Order.findOne({orderId})

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  
      const item = order.orderedItems.find(
        (item) => item.product.toString() === productId && item.sku === sku
      );
     
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
      if (item.status !== 'Delivered') {
        return res.status(400).json({ success: false, message: 'Item not eligible for return' });
      }
  
      item.status = 'Return Request';
      item.returnReason = reason;
      await order.save();
  
      res.json({ success: true, message: "Return Requested Successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }


module.exports={
    myOrders,
    getOrderDetails,
    cancelOrder,
    productCancelOrder,
    productReturnOrder,

}
