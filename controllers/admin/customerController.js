const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const Category = require("../../models/categorySchema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = Number(req.query.page);
    }
    const limit = 6;
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } }, // search for all charectors (start or end)
        { email: { $regex: ".*" + search + ".*" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await User.find({
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*" } }, // search for all charectors (start or end)
        { email: { $regex: ".*" + search + ".*" } },
      ],
    }).countDocuments();
    const totalPages = Math.ceil(count / limit);

    res.render("users", {
      data: userData,
      totalPages: totalPages,
      currentPage: page,
    });
  } catch (error) {
<<<<<<< HEAD
    res.redirect("/pageError");
=======
     res.redirect('/admin/pageError');
>>>>>>> d96c03c (Recovered from local corruption)
  }
};

const blockCustomer = async (req, res) => {
  try {
    let { id } = req.params;
    console.log(id);
    
    if(!id){
       return res.status(400).json({success:false,message:"User does not exist"})
    }
    const blockUser = await User.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true } // returns the updated document
    );

    if(blockUser){
      return res.status(200).json({success:true,message:"User Blocked Successfully"})
    }else{
      return res.status(400).json({success:false,message:"Error occurred while Blocking User"})
    }

  } catch (error) {
<<<<<<< HEAD
    res.redirect("/pageError");
    return res.status(500).json({success:false,message:"Internal Server Error"})
=======
    console.log(error);
    
    res.redirect('/admin/pageError');
>>>>>>> d96c03c (Recovered from local corruption)

  }
};




const unblockCustomer = async (req, res) => {
  try {
    let { id } = req.params;
    if(!id){
       return res.status(400).json({success:false,message:"User does not exist"})
    }
    const blockUser = await User.findByIdAndUpdate(
      id,
      { isBlocked: false },
      { new: true } // returns the updated document
    );

    if(blockUser){
      return res.status(200).json({success:true,message:"User Blocked Successfully"})
    }else{
      return res.status(400).json({success:false,message:"Error occurred while Blocking User"})
    }
    
  } catch (error) {
    res.redirect("/pageError");
  }
};


const walletDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;

    // Fetch user
    const user = await User.findById(id);
    if (!user) {
      return res.redirect("/admin/users");
    }

    // Fetch wallet and paginate transactions
    const wallet = await Wallet.findOne({ userId: id });
    if (!wallet) {
      console.log("User does not have a wallet");
      return res.redirect("/admin/users");
    }

    // Calculate pagination details
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / itemsPerPage);
    const skip = (page - 1) * itemsPerPage;

    // Validate page number
    if (page < 1 || (page > totalPages && totalPages > 0)) {
      return res.redirect(`/admin/walletDetails/${id}?page=1`);
    }

    // Slice transactions for the current page
    const transactions = wallet.transactions.slice(skip, skip + itemsPerPage);

    // Render the wallet details page with pagination data
    return res.render("walletDetails", {
      user,
      wallet: {
        balance: wallet.balance,
        transactions: transactions,
      },
      currentPage: page,
      totalPages: totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
      itemsPerPage: itemsPerPage,
    });
  } catch (error) {
    console.error("Error in walletDetails:", error);
    return res.redirect("/admin/pageError");
  }
};



const transactionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    const order = await Order.findById(id).populate("orderedItems.product");
    console.log(order.userId);
  

    const wallet = await Wallet.findOne({ userId: order.userId });
    const returnedAmount = wallet.transactions
      .filter(
        (tr) =>
          tr.type === "Credit" &&
          tr.method === "Refund" &&
          tr.status === "Completed" &&
          tr.orderId?.toString() === order._id.toString() // match specific order
      )
      .reduce((sum, tr) => sum + tr.amount, 0);
    

   
    let totalPrice = 0;
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const orderedProducts = order.orderedItems.map((item) => {
      const product = item.product;
      // Find the matching variant by SKU
      const matchedVariant = product.variants.find(
        (variant) => variant.sku === item.sku
      );

      totalPrice += matchedVariant?.salePrice * item.quantity;

      return {
        productId: product._id,
        productName: product.productName,
        matchedVariant, // contains size, price, sku, etc.
        quantity: item.quantity,
        orderItemStatus: item.status,
        productImage: product.productImage,
        price: item.price,
        status: item.status,
      };
    });
    

    const discount = totalPrice-returnedAmount
    const response = {
      orderId: order.orderId,
      status: "Completed",
      cancellationReason:
        order.cancellationReason ||
        "Due to recent adjustments in our brand schedule and priorities, we will unfortunately need to cancel this engagement at this time. We truly appreciate your understanding and hope to explore future opportunities together.",
      shippingAddress: {
        name: order.address.name,
        details: `${order.address.addressType}, ${order.address.city}, ${order.address.landMark}, ${order.address.state} - ${order.address.pincode}`,
        mobile: order.address.phone,
      },
      items: orderedProducts,
      paymentMethod: order.orderType,
      totalPrice,
      discount,
      finalAmount: returnedAmount,
      returnedAmount,
      couponApplied: order.couponDiscount || "None",
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching transaction details:", error);
<<<<<<< HEAD
    res.status(500).json({ error: "Server error" });
=======
    res.redirect('/admin/pageError');
>>>>>>> d96c03c (Recovered from local corruption)
  }
};

module.exports = {
  customerInfo,
  blockCustomer,
  unblockCustomer,
  walletDetails,
  transactionDetails,
};
<<<<<<< HEAD

// const response = {
//     orderId: order.orderId,
//     status: order.status,
//     cancellationReason: order.cancellationReason || 'N/A',
//     shippingAddress: {
//       name: order.address.name,
//       details: `${order.address.addressType}, ${order.address.city}, ${order.address.landMark}, ${order.address.state} - ${order.address.pincode}`,
//       mobile: order.address.phone
//     },
//     items: items,
//     paymentMethod: paymentMethod,
//     totalPrice: order.totalPrice,
//     discount: totalDiscount,
//     finalAmount: order.finalAmount,
//     returnedAmount: returnedAmount,
//     couponApplied: order.couponCode || 'None'
//   };
=======
>>>>>>> d96c03c (Recovered from local corruption)
