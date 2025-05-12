const Offer = require("../../models/offerSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const mongoose = require("mongoose");
const Coupon = require("../../models/couponSchema");

const getOfferPage = async (req, res) => {
  try {
    const {
      search = "",
      offerType = "",
      page = 1,
      sortBy = "newest",
    } = req.query;
    const limit = 5;
    const skip = (parseInt(page) - 1) * limit;

    let query = { isDeleted: false };
    let sortOptions = {};

    // Set sort options based on sortBy parameter
    switch (sortBy) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "oldest":
        sortOptions = { createdAt: 1 };
        break;
      case "category_name":
        sortOptions = { "applicableTo.name": 1 };
        break;
      case "category_name_desc":
        sortOptions = { "applicableTo.name": -1 };
        break;
      case "product_name":
        sortOptions = { "applicableTo.name": 1 };
        break;
      case "product_name_desc":
        sortOptions = { "applicableTo.name": -1 };
        break;
      case "offer_name":
        sortOptions = { offerName: 1 };
        break;
      case "offer_name_desc":
        sortOptions = { offerName: -1 };
        break;
      case "discount_high":
        sortOptions = { discountAmount: -1 };
        break;
      case "discount_low":
        sortOptions = { discountAmount: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    const searchConditions = [
      { offerName: { $regex: new RegExp(search, "i") } },
    ];

    if (offerType && offerType !== "All") {
      searchConditions.push({
        offerType: { $regex: new RegExp(`^${offerType}$`, "i") },
      });
    }

    if (search.trim()) {
      const matchingCategory = await Category.findOne({
        name: { $regex: new RegExp(search, "i") },
        isListed: true,
        isDeleted: false,
      });

      if (matchingCategory) {
        query.applicableTo = matchingCategory._id;
      }
    }

    query = { ...query, $or: searchConditions };

    const offers = await Offer.find(query)
      .populate({
        path: "applicableTo",
        select: "categoryName productName brandName name",
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalOffers = await Offer.countDocuments(query);
    const totalPages = Math.ceil(totalOffers / limit);

    res.render("offers", {
      offers,
      search,
      offerType,
      sortBy,
      page: parseInt(page),
      totalPages,
      sortOptions: [
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "offer_name", label: "Offer Name (A-Z)" },
        { value: "offer_name_desc", label: "Offer Name (Z-A)" },
        { value: "category_name", label: "Category Name (A-Z)" },
        { value: "category_name_desc", label: "Category Name (Z-A)" },
        { value: "product_name", label: "Product Name (A-Z)" },
        { value: "product_name_desc", label: "Product Name (Z-A)" },
        { value: "discount_high", label: "Discount (High to Low)" },
        { value: "discount_low", label: "Discount (Low to High)" },
      ],
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res
      .status(500)
      .render("error", { message: "An error occurred while fetching offers" });
  }
};

const listOffer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid offer ID" });
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    if (offer.isDeleted) {
      return res.status(400).json({ error: "Cannot list a deleted offer" });
    }

    offer.isListed = true;
    await offer.save();

    res.status(200).json({ message: "Offer listed successfully" });
  } catch (error) {
    console.error("Error listing offer:", error);
    res
      .status(500)
      .json({ error: "An error occurred while listing the offer" });
  }
};

const unlistOffer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid offer ID" });
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    if (offer.isDeleted) {
      return res.status(400).json({ error: "Cannot unlist a deleted offer" });
    }

    offer.isListed = false;
    await offer.save();

    res.status(200).json({ message: "Offer unlisted successfully" });
  } catch (error) {
    console.error("Error unlisting offer:", error);
    res
      .status(500)
      .json({ error: "An error occurred while unlisting the offer" });
  }
};

const deleteOffer = async (req, res) => {
  try {
    const { id } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid offer ID" });
    }

    const offer = await Offer.findById(id);
    if (!offer) {
      return res.status(404).json({ error: "Offer not found" });
    }

    offer.isDeleted = true;
    await offer.save();

    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error deleting offer:", error);
    res
      .status(500)
      .json({ error: "An error occurred while deleting the offer" });
  }
};

const getAddOffer = async (req, res) => {
  try {
    const product = await Product.find({ isDeleted: false, isBlocked: false });
    const category = await Category.find({ isDeleted: false, isListed: true });
    return res.render("addOffer", { product, category });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: true, message: "Internal Server" });
  }
};

const addOffer = async (req, res) => {
  try {
    const {
      offerName,
      description,
      discountType,
      discountAmount,
      validFrom,
      validUpto,
      offerType,
      applicableTo,
      offerTypeRef,
    } = req.body;

    if (
      !offerName ||
      !description ||
      !discountType ||
      !discountAmount ||
      !validFrom ||
      !validUpto ||
      !offerType ||
      !applicableTo ||
      !offerTypeRef
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    
    if (offerName.trim().length < 3) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Offer name must be at least 3 characters long",
        });
    }

    if (description.trim().length < 10) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Description must be at least 10 characters long",
        });
    }

    if (!discountType) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount type" });
    }

    const discount = parseFloat(discountAmount);
    if (isNaN(discount) || discount <= 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Discount amount must be greater than zero",
        });
    }

    if (discountType === "percentage") {
      if (discount > 50) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Discount percentage cannot exceed 50%",
          });
      }
    }

   
  

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validFromDate = new Date(validFrom);
    const validUptoDate = new Date(validUpto);

    if (isNaN(validFromDate.getTime()) || isNaN(validUptoDate.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format" });
    }

    if (validFromDate < today) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid from date cannot be in the past",
        });
    }

    if (validUptoDate <= validFromDate) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid until date must be after valid from date",
        });
    }

    const validOfferTypes = ["Category", "Product"];
    if (
      !validOfferTypes.includes(offerType) ||
      !validOfferTypes.includes(offerTypeRef)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid offer type" });
    }

    if (offerType !== offerTypeRef) {
      return res
        .status(400)
        .json({
          success: false,
          message: "offerType and offerTypeRef must match",
        });
    }

    if (!mongoose.Types.ObjectId.isValid(applicableTo)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid applicableTo ID" });
    }

    let modelName;
    if (offerType === "Category") modelName = "Category";
    else if (offerType === "Product") modelName = "Product";

    const Model = mongoose.model(modelName);
    const exists = await Model.findById(applicableTo);
    if (!exists) {
      return res
        .status(400)
        .json({ success: false, message: `${offerType} not found` });
    }

    const existingOffer = await Offer.findOne({
      offerName: { $regex: `^${offerName.trim()}$`, $options: "i" },
      isDeleted: false,
    });

    if (existingOffer) {
      return res
        .status(400)
        .json({ success: false, message: "Offer name already exists" });
    }

    const newOffer = new Offer({
      offerName: offerName.trim(),
      description: description.trim(),
      discountType,
      discountAmount: discount,
      validFrom: validFromDate,
      validUpto: validUptoDate,
      offerType,
      applicableTo,
      offerTypeRef,
      isListed: true,
      isDeleted: false,
    });

    await newOffer.save();

    res.status(201).json({
      success: true,
      message: "Offer added successfully",
      offer: newOffer,
    });
  } catch (error) {
    console.error("Error adding offer:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while adding the offer",
      });
  }
};


const getEditOffer = async (req, res) => {
    try {
      const { id } = req.query;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .render("error", { message: "Invalid Offer ID format" });
      }
  
      const offer = await Offer.findById(id).populate("applicableTo");
      if (!offer) {
        return res.status(404).render("error", { message: "Offer not found" });
      }
  
      const categories = await Category.find({ isDeleted: false });
      const products = await Product.find({ isDeleted: false });
  
      return res.render("editOffer", {
        offer,
        category: categories,
        product: products,
      });
    } catch (error) {
      console.error("Error in getEditOffer:", error);
      return res
        .status(500)
        .render("error", { message: "Internal server error" });
    }
  };
  const editOffer = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate offer ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid offer ID format" });
      }
  
      const {
        offerName,
        description,
        discountType,
        discountAmount,
        validFrom,
        validUpto,
        offerType,
        applicableTo,
        offerTypeRef,
      } = req.body;
  
      // Check for required fields
      if (
        !offerName ||
        !description ||
        !discountType ||
        !discountAmount ||
        !validFrom ||
        !validUpto ||
        !offerType ||
        !applicableTo ||
        !offerTypeRef
      ) {
        return res
          .status(400)
          .json({ success: false, message: "All fields are required" });
      }
  
      // Validate offerName
      if (offerName.trim().length < 3) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Offer name must be at least 3 characters long",
          });
      }
      if (!/^[A-Za-z\s]+$/.test(offerName.trim())) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Offer name must contain only letters and spaces",
          });
      }
  
      // Validate description
      if (description.trim().length < 10) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Description must be at least 10 characters long",
          });
      }
  
      // Validate discountType
      if (discountType !== "percentage") {
        return res
          .status(400)
          .json({ success: false, message: "Invalid discount type" });
      }
  
      // Validate discountAmount
      const discount = parseFloat(discountAmount);
      if (isNaN(discount) || discount <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Discount amount must be greater than zero",
          });
      }
      if (discountType === "percentage" && discount > 50) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Discount percentage cannot exceed 50%",
          });
      }
  
      // Validate dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validFromDate = new Date(validFrom);
      const validUptoDate = new Date(validUpto);
  
      if (isNaN(validFromDate.getTime()) || isNaN(validUptoDate.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid date format" });
      }
  
      if (validFromDate < today) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Valid from date cannot be in the past",
          });
      }
  
      if (validUptoDate <= validFromDate) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Valid until date must be after valid from date",
          });
      }
  
      // Validate offerType and offerTypeRef
      const validOfferTypes = ["Category", "Product"];
      if (
        !validOfferTypes.includes(offerType) ||
        !validOfferTypes.includes(offerTypeRef)
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid offer type" });
      }
  
      if (offerType !== offerTypeRef) {
        return res
          .status(400)
          .json({
            success: false,
            message: "offerType and offerTypeRef must match",
          });
      }
  
      // Validate applicableTo
      if (!mongoose.Types.ObjectId.isValid(applicableTo)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid applicableTo ID" });
      }
  
      // Verify applicableTo exists
      let modelName;
      if (offerType === "Category") modelName = "Category";
      else if (offerType === "Product") modelName = "Product";
  
      const Model = mongoose.model(modelName);
      const exists = await Model.findById(applicableTo);
      if (!exists) {
        return res
          .status(400)
          .json({ success: false, message: `${offerType} not found` });
      }
  
      
      
      const existingOffers = await Offer.find({
        _id: { $ne: id },
        offerName: { $regex: `^${offerName.trim()}$`, $options: 'i' },
        isDeleted: false,
      });
      
      const exactMatch = existingOffers.find(
        (offer) => offer.offerName.trim().toLowerCase() === offerName.trim().toLowerCase()
      );
      
      if (exactMatch) {
        return res.status(400).json({ success: false, message: "Offer already exists!" });
      }
      
      
      
      // Prepare update object
      const updateData = {
        offerName: offerName.trim(),
        description: description.trim(),
        discountType,
        discountAmount: discount,
        validFrom: validFromDate,
        validUpto: validUptoDate,
        offerType,
        applicableTo,
        offerTypeRef,
        isListed: true,
        isDeleted: false,
      };
  
      // Update offer in DB
      const updatedOffer = await Offer.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
  
      if (!updatedOffer) {
        return res
          .status(404)
          .json({ success: false, message: "Offer not found" });
      }
  
      res.status(200).json({
        success: true,
        message: "Offer updated successfully",
        offer: updatedOffer,
      });
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating the offer",
      });
    }
  };
module.exports = {
  getOfferPage,
  getAddOffer,
  addOffer,
  listOffer,
  unlistOffer,
  deleteOffer,
  getEditOffer,
  editOffer,
};
