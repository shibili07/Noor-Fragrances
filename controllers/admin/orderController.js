const User = require("../../models/userSchema")
const Order = require("../../models/orderSchema")
const Product = require("../../models/productSchema")
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const Offer = require("../../models/offerSchema")
const Coupon = require("../../models/couponSchema")
const loadOrders = async (req, res) => {
  try {
      const perPage = 6;
      const page = parseInt(req.query.page) || 1;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const startDate = req.query.startDate || '';
      const endDate = req.query.endDate || '';

      let matchingUserIds = [];
      if (search) {
          const matchingUsers = await User.find({
              name: { $regex: search, $options: 'i' }
          }).select('_id');
          matchingUserIds = matchingUsers.map(user => user._id);
      }

      const query = {
          $or: [
              { orderId: { $regex: search, $options: 'i' } },
              { status: { $regex: search, $options: 'i' } },
              ...(matchingUserIds.length > 0 ? [{ userId: { $in: matchingUserIds } }] : [])
          ]
      };

      // Add status filter if selected (exclude 'All')
      if (status && status !== 'All') {
          query.status = status;
      }

      // Add date range filter if dates are provided
      if (startDate && endDate) {
          // Parse dd/mm/yyyy format
          const parseDate = (dateStr) => {
              const [day, month, year] = dateStr.split('/');
              const date = new Date(year, month - 1, day);
              return isNaN(date) ? null : date;
          };

          const start = parseDate(startDate);
          const end = parseDate(endDate);

          if (start && end) {
              // Set start to beginning of the day and end to end of the day
              start.setHours(0, 0, 0, 0);
              end.setHours(23, 59, 59, 999);

              if (end >= start) {
                  query.createdOn = {
                      $gte: start,
                      $lte: end
                  };
              } else {
                  // Invalid date range; ignore the filter
                  console.warn('Invalid date range: endDate is before startDate');
              }
          } else {
              console.warn('Invalid date format for startDate or endDate');
          }
      }

      const totalOrders = await Order.countDocuments(query);
      const totalPages = Math.ceil(totalOrders / perPage);

      const orders = await Order.find(query)
          .populate('address')
          .populate('userId', 'name email')
          .sort({ createdOn: -1 }) // Sort by createdOn descending (newest first)
          .skip((page - 1) * perPage)
          .limit(perPage);

      res.render('order', {
          orders,
          currentPage: page,
          totalPages,
          search,
          status,
          startDate,
          endDate,
          statusOptions: ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
      });

  } catch (err) {
      console.error('Error fetching orders:', err);
      res.status(500).send('Server Error');
  }
};


const viewOrder = async (req, res) => {
    try {
        const { id } = req.query;

        const order = await Order.findById(id)
            .populate({
                path: 'orderedItems.product',
                model: 'Product'
            })
            .populate({
                path: 'userId',
                model: 'User',
                select: 'name email'
            });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const address = order.address;
        console.log(address);

        res.render('viewOrder', { order, address });

    } catch (err) {
        console.error('Error loading order details:', err);
        res.status(500).send('Server Error');
    }
};



const updateStatus = async (req, res) => {
    try {
        const { status, orderId } = req.body;
        console.log(status);
        
        const order = await Order.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found',
            });
        }

        order.status = status;

        order.orderedItems.forEach(item => {
            if (item.status !== 'Cancelled') {
                item.status = status;
            }
        });
        
        const updatedOrder = await order.save();

        return res.status(200).json({
            success: true,
            message: 'Order status updated successfully',
            updatedStatus: updatedOrder.status,
        });
    } catch (error) {
        console.error("Error updating status:", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while updating status',
        });
    }
};


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
  
  const handleAcceptReturn = async (req, res) => {
    try {
      const { orderId, itemId, action } = req.body;
  
      // Validate required fields
      if (!orderId || !itemId || !action) {
        return res.status(400).json({
          success: false,
          message: 'Order ID, item ID, and action are required',
        });
      }
  
      // Find the order
      const order = await Order.findOne({ orderId }).populate('orderedItems.product');
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }
  
      // Find the item in orderedItems with 'Return Request' status
      const item = order.orderedItems.find(
        (item) => item._id.toString() === itemId && item.status === 'Return Request'
      );
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found or not in return request status',
        });
      }
  
      if (action === 'accept') {
        // Update item status
        item.status = 'Returned';
  
        // Find the product and variant
        const product = await Product.findById(item.product._id);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found',
          });
        }
  
        const variant = product.variants.find((v) => v.sku === item.sku);
        if (!variant) {
          return res.status(404).json({
            success: false,
            message: 'Product variant not found',
          });
        }
  
        // Update stock
        variant.quantity += item.quantity;
        if (product.status === 'out of stock' && variant.quantity > 0) {
          product.status = 'Available';
        }
        await product.save();
  
        // Find applicable offers for product and category
        const offers = await Offer.find({
          $or: [
            {
              applicableTo: item.product,
              offerTypeRef: 'Product',
            },
            {
              applicableTo: product.category,
              offerTypeRef: 'Category',
            },
          ],
          isListed: true,
          isDeleted: false,
          validFrom: { $lte: new Date() },
          validUpto: { $gte: new Date() },
        });
  
        console.log('Found Offers:', offers);
  
        // Calculate the best offer
        let bestOffer = null;
        let maxDiscount = 0;
  
        for (const offer of offers) {
          let discount = 0;
          if (offer.discountType === 'percentage') {
            const actualPrice = variant.salePrice * item.quantity;
            discount = actualPrice * (offer.discountAmount / 100);
          } else if (offer.discountType === 'flat') {
            discount = offer.discountAmount;
          }
          if (discount > maxDiscount) {
            maxDiscount = discount;
            bestOffer = offer;
          }
        }
  
        console.log('Best Offer:', bestOffer, 'Max Discount:', maxDiscount);
  
        // Calculate amounts
        const actualPrice = variant.salePrice * item.quantity;
        const offerDiscount = maxDiscount;
  
        // Update order totals
        order.totalPrice -= actualPrice;
        order.finalAmount -= (actualPrice - offerDiscount);
        order.offerDiscount -= offerDiscount;
  
        // Ensure non-negative values
        if (order.totalPrice < 0) order.totalPrice = 0;
        if (order.finalAmount < 0) order.finalAmount = 0;
        if (order.offerDiscount < 0) order.offerDiscount = 0;
  
        console.log('Order Offer Discount After:', order.offerDiscount);
  
        // Handle coupon if applied
        let refundAmount = actualPrice - offerDiscount;
        if (order.couponApplied && order.couponCode) {
          const coupon = await Coupon.findOne({ couponCode: order.couponCode });
          if (coupon) {
            const remainingAmount = order.totalPrice - order.offerDiscount;
            console.log('Remaining amount after return:', remainingAmount);
            console.log('Coupon minimum price:', coupon.minimumPrice);
  
            // Check if remaining amount is below coupon's minimum price
            if (remainingAmount < coupon.minimumPrice) {
              console.log('Removing coupon as remaining amount is below minimum');
  
              // Adjust final amount by removing coupon discount
              order.finalAmount += order.couponDiscount;
  
              // Adjust refund amount
              console.log('Original refund amount:', refundAmount);
              refundAmount -= order.couponDiscount;
              console.log('Adjusted refund amount:', refundAmount);
  
              // Reset coupon fields
              order.couponDiscount = 0;
              order.couponApplied = false;
              order.couponCode = null;
  
              console.log('Coupon removed. New final amount:', order.finalAmount);
            }
          }
        }
  
        // Process refund to wallet
        if (refundAmount > 0) {
          await refundToWallet(
            order._id,
            order.userId,
            refundAmount,
            `Refund for returned product in order ${order.orderId}`
          );
        }
  
        // Check if all items are returned or cancelled
        const allReturnedOrCancelled = order.orderedItems.every(
          (item) => item.status === 'Returned' || item.status === 'Cancelled'
        );
        if (allReturnedOrCancelled) {
          order.status = 'Returned';
        }
  
        await order.save();
  
        return res.status(200).json({
          success: true,
          message: 'Return request accepted successfully',
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action',
        });
      }
    } catch (error) {
      console.error('Error handling return action:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };



const handleRejectReturn = async (req, res) => {
    try {
      const { orderId, itemId, action, reason } = req.body;
    
      if (!reason) {
        return res.status(400).json({ success: false, message: "Reason is required." });
      }
  
      if (!orderId || !itemId || !action) {
        return res.status(400).json({ success: false, message: "Missing required fields!" });
      }
  
      const order = await Order.findOneAndUpdate(
  { 
    orderId,
    'orderedItems._id': itemId 
  },
  { 
    $set: { 
      'orderedItems.$.status': 'Return Rejected',
      'orderedItems.$.returnRejectReason': reason   // ← correct spelling
    } 
  },
  { new: true }
);


      if (!order) {
        return res.status(404).json({ success: false, message: "Order or item not found." });
      }

    
      return res.status(200).json({ 
        success: true, 
        message: "Return request rejected successfully.",
        order 
      });
  
    } catch (error) {
      console.error("Error in handleRejectReturn:", error);
      return res.status(500).json({ success: false, message: "Server error." });
    }
  };
  
module.exports={
    loadOrders,
    viewOrder,
    updateStatus,
    handleAcceptReturn,
    handleRejectReturn
   

}