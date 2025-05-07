const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const mongoose = require("mongoose");
const Offer = require("../../models/offerSchema");
const Wishlist = require("../../models/wishlistSchema")

const loadShopPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    const categories = await Category.find({
      isListed: true,
      isDeleted: false,
    });
    const search = req.query.search?.trim() || "";
    const sort = req.query.sort || "";
    const genderf = req.query.genderf || "";
    const categoryf = req.query.categoryf || "";
    const size = req.query.size || "";
    const page = parseInt(req.query.page) || 1;
    const perPage = 9;
    const minValue = parseFloat(req.query.minValue) || 1;
    const maxValue = parseFloat(req.query.maxValue) || 100000;

    // Base filter for products
    let filter = {
      isDeleted: false,
      isBlocked: false,
      isListed: true,
    };
    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }
    if (categoryf) {
      if (mongoose.Types.ObjectId.isValid(categoryf)) {
        filter.category = new mongoose.Types.ObjectId(categoryf);
      } else {
        throw new Error("Invalid category ID format");
      }
    }
    if (genderf) {
      filter.gender = genderf;
    }

    // Variant conditions
    let variantConditions = {
      "variants.quantity": { $gte: 0 },
      "variants.salePrice": { $gte: minValue, $lte: maxValue },
    };
    if (size) {
      variantConditions["variants.size"] = size;
    }

    // Sorting options
    let sortOption = {};
    if (sort === "A-Z") {
      sortOption = { productName: 1 };
    } else if (sort === "Z-A") {
      sortOption = { productName: -1 };
    } else if (sort === "Price : low - high" || sort === "Price : high - low") {
      sortOption = { minPrice: sort === "Price : low - high" ? 1 : -1 };
    } else {
      sortOption = { createdAt: -1 };
    }

    // Aggregation pipeline
    const aggregationPipeline = [
      { $match: filter },
      { $unwind: "$variants" },
      { $match: variantConditions },
      {
        $group: {
          _id: "$_id",
          productName: { $first: "$productName" },
          productImage: { $first: "$productImage" },
          brand: { $first: "$brand" },
          category: { $first: "$category" },
          gender: { $first: "$gender" },
          isDeleted: { $first: "$isDeleted" },
          isBlocked: { $first: "$isBlocked" },
          isListed: { $first: "$isListed" },
          createdAt: { $first: "$createdAt" },
          variants: { $push: "$variants" },
          minPrice: { $min: "$variants.salePrice" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $addFields: {
          category: { $arrayElemAt: ["$categoryInfo", 0] },
        },
      },
      {
        $match: {
          "category.isListed": true,
          "category.isDeleted": false,
        },
      },
      {
        $lookup: {
          from: "offers",
          let: { productId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$offerType", "Product"] },
                    { $eq: ["$applicableTo", "$$productId"] },
                    { $eq: ["$isListed", true] },
                    { $eq: ["$isDeleted", false] },
                    { $lte: ["$validFrom", new Date()] },
                    { $gte: ["$validUpto", new Date()] },
                  ],
                },
              },
            },
            { $project: { discountAmount: 1 } },
          ],
          as: "productOffer",
        },
      },
      {
        $addFields: {
          effectiveOffer: {
            $ifNull: [{ $arrayElemAt: ["$productOffer.discountAmount", 0] }, 0],
          },
        },
      },
      {
        $addFields: {
          // Update variants with offerPrice
          variants: {
            $map: {
              input: "$variants",
              as: "variant",
              in: {
                $mergeObjects: [
                  "$$variant",
                  {
                    offerPrice: {
                      $cond: {
                        if: { $gt: ["$effectiveOffer", 0] },
                        then: {
                          $multiply: [
                            "$$variant.salePrice",
                            { $subtract: [1, { $divide: ["$effectiveOffer", 100] }] },
                          ],
                        },
                        else: "$$variant.salePrice",
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      { $project: { categoryInfo: 0, productOffer: 0 } },
      { $sort: sortOption },
      { $skip: (page - 1) * perPage },
      { $limit: perPage },
    ];

    const products = await Product.aggregate(aggregationPipeline);

    // Count pipeline for pagination
    const countPipeline = [
      { $match: filter },
      { $unwind: "$variants" },
      { $match: variantConditions },
      { $group: { _id: "$_id" } },
      { $count: "total" },
    ];

    const countResult = await Product.aggregate(countPipeline);
    const totalProducts = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(totalProducts / perPage) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));

    return res.render("shop", {
      user,
      products,
      totalProducts,
      totalPages,
      currentPage,
      maxValue,
      minValue,
      search,
      sort,
      categoryf,
      genderf,
      size,
      category: categories,
    });
  } catch (error) {
    console.error("Error loading shop page:", error);
    res.status(500).send("An error occurred while loading the shop page");
  }
};




// Helper function to determine the best offer
function getBestOffer(applicableOffers, product) {
  if (!Array.isArray(applicableOffers) || applicableOffers.length === 0) return null;

  let bestOffer = null;
  let maxDiscount = 0;

  for (const offer of applicableOffers) {
    let discount = 0;

    // Calculate discount amount based on salePrice
    if (offer.discountType === 'flat') {
      discount = offer.discountAmount;
    } else if (offer.discountType === 'percentage') {
      discount = (product.variants[0].salePrice * offer.discountAmount) / 100;
    }

    // Update best offer if this discount is higher, or equal but product-specific
    if (
      discount > maxDiscount ||
      (discount === maxDiscount && offer.offerType === 'Product' && bestOffer?.offerType !== 'Product')
    ) {
      maxDiscount = discount;
      bestOffer = offer;
    }
  }

  return bestOffer;
}

// Product details controller
const productDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch product with category populated
    const product = await Product.findById(id).populate('category').lean();
    if (!product || product.isDeleted || product.isBlocked || !product.isListed) {
      return res.redirect('/pageError');
    }

    // Fetch user data if logged in
    const user = req.session.user;
    const userData = user ? await User.findById(user).lean() : null;

    // Fetch active offers
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const allOffers = await Offer.find({
      isListed: true,
      isDeleted: false,
      validFrom: { $lte: endOfDay },
      validUpto: { $gte: startOfDay }
    })
      .populate('applicableTo')
      .lean();

    // Filter offers for product or its category
    const offers = allOffers.filter((offer) => {
      const offerId = offer.applicableTo?._id?.toString();
      return (
        (offer.offerType === 'Product' && offerId === product._id.toString()) ||
        (offer.offerType === 'Category' && offerId === product.category._id.toString())
      );
    });

    // Get best offer
    const bestOffer = getBestOffer(offers, product);

    // Process variants with salePrice and discountedPrice
    const processedProduct = {
      ...product,
      variants: product.variants.map((variant) => {
        let discountedPrice = null; // Only set if there's an offer
        if (bestOffer) {
          if (bestOffer.discountType === 'flat') {
            discountedPrice = Math.max(0, variant.salePrice - bestOffer.discountAmount);
          } else if (bestOffer.discountType === 'percentage') {
            discountedPrice = variant.salePrice * (1 - bestOffer.discountAmount / 100);
          }
        }
        return {
          ...variant,
          discountedPrice: discountedPrice ? discountedPrice.toFixed(2) : null,
          stockStatus: variant.quantity > 0 ? 'In Stock' : 'Out of Stock'
        };
      })
    };

    // Fetch similar products
    const similarProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isListed: true,
      isDeleted: false,
      isBlocked: false
    })
      .limit(9)
      .lean();

    // Render product details page
    res.render('product-details', {
      user: userData,
      product: processedProduct,
      category: product.category,
      similar: similarProducts,
      offers,
      bestOffer
    });
  } catch (error) {
    console.error('Error in productDetails:', error);
    res.redirect('/pageError');
  }
};

//wish list 






const addToWishlist = async (req, res) => {
  try {
    const { productId, sku } = req.params;
    console.log(sku);
    
    const userId = req.user.id;

    const product = await Product.findOne({ 
      _id: productId, 
      isDeleted: false, 
      isListed: true,
      'variants.sku': sku 
    });

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found or invalid SKU' 
      });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
    
      const itemExists = wishlist.items.some(
        item => item.product.toString() === productId && item.sku === sku
      );
      if (itemExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product already in wishlist' 
        });
      }

      wishlist.items.push({ product: productId, sku });
      await wishlist.save();
    } else {
      wishlist = await Wishlist.create({
        userId,
        items: [{ product: productId, sku }]
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product added to wishlist successfully',
      data: wishlist
    });

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while adding to wishlist',
      error: error.message
    });
  }
}



const loadWishlist = async (req, res) => {
  try {
    // Get userId from session
    const userId = req.session.user;
    const userData = await User.findById(userId)
    if (!userId) {
      return res.status(400).render('error', {
        message: 'User ID is required',
        error: 'Please log in to view your wishlist',
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 4; // Set limit to 4 items per page
    const skip = (page - 1) * limit;

    // Find the user's wishlist and populate product details
    const wishlist = await Wishlist.findOne({ userId })
      .populate({
        path: 'items.product',
        select: 'productName shortDescription productImage variants brand status isListed isDeleted',
        match: { isListed: true, isDeleted: false },
      })
      .lean();

    // Prepare data for frontend
    let wishlistData = {
      wishlistId: null,
      items: [],
      addedAt: null,
    };

    if (wishlist && wishlist.items.length) {
      // Filter and map items
      const items = wishlist.items
        .filter(item => item.product) // Remove items with invalid/unlisted products
        .map(item => {
          const variant = item.product.variants.find(v => v.sku === item.sku);
          return {
            productId: item.product._id,
            productName: item.product.productName,
            shortDescription: item.product.shortDescription,
            brand: item.product.brand,
            productImage: item.product.productImage[0] || '/images/placeholder.jpg',
            sku: item.sku,
            size: variant ? variant.size : 'N/A',
            regularPrice: variant ? variant.regularPrice : null,
            salePrice: variant ? variant.salePrice : null,
            quantity: variant ? variant.quantity : null,
            status: item.product.status,
          };
        });

      // Apply pagination
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / limit);
      const paginatedItems = items.slice(skip, skip + limit);

      wishlistData = {
        wishlistId: wishlist._id,
        items: paginatedItems,
        addedAt: wishlist.addedAt,
      };

     // Render wishlist with pagination data
     res.render('wishlist', {
      wishlist: { data: wishlistData },
      user:userData,
      totalPages,
      currentPage: page,
      limit,
    });
  } else {
    // Render empty wishlist
    res.render('wishlist', {
      wishlist: { data: wishlistData },
      user:userData,
      totalPages: 1,
      currentPage: 1,
      limit,
    });
    }
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).render('error', {
      message: 'Failed to load wishlist',
      error: error.message,
    });
  }
};



const removeTOWishlist = async (req, res) => {
  try {
    const userId = req.session.user; 
    const { productId } = req.body; 
    console.log(productId);
    
    const wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }
    const productIndex = wishlist.items.findIndex(item => item.product.toString() === productId.toString());

    if (productIndex === -1) {
      return res.status(400).json({ success: false, message: "Product not found in wishlist" });
    }
    wishlist.items.splice(productIndex, 1);
    await wishlist.save();

    return res.status(200).json({ success: true, message: "Product removed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};




module.exports = {
  loadShopPage,
  productDetails,
  loadWishlist,
  addToWishlist,
  removeTOWishlist 

  
};


