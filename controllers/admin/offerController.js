const Offer = require("../../models/offerSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const mongoose = require('mongoose');
const Coupon = require("../../models/couponSchema");


const getOfferPage = async (req, res) => {
    try {
        const { search = '', offerType = '', page = 1, sortBy = 'newest' } = req.query;
        const limit = 5;
        const skip = (parseInt(page) - 1) * limit;

        let query = { isDeleted: false };
        let sortOptions = {};

        // Set sort options based on sortBy parameter
        switch (sortBy) {
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'oldest':
                sortOptions = { createdAt: 1 };
                break;
            case 'category_name':
                sortOptions = { 'applicableTo.name': 1 };
                break;
            case 'category_name_desc':
                sortOptions = { 'applicableTo.name': -1 };
                break;
            case 'product_name':
                sortOptions = { 'applicableTo.name': 1 };
                break;
            case 'product_name_desc':
                sortOptions = { 'applicableTo.name': -1 };
                break;
            case 'offer_name':
                sortOptions = { offerName: 1 };
                break;
            case 'offer_name_desc':
                sortOptions = { offerName: -1 };
                break;
            case 'discount_high':
                sortOptions = { discountAmount: -1 };
                break;
            case 'discount_low':
                sortOptions = { discountAmount: 1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        const searchConditions = [
            { offerName: { $regex: new RegExp(search, 'i') } },
        ];

        if (offerType && offerType !== 'All') {
            searchConditions.push({
                offerType: { $regex: new RegExp(`^${offerType}$`, 'i') }
            });
        }

        if (search.trim()) {
            const matchingCategory = await Category.findOne({
                name: { $regex: new RegExp(search, 'i') },
                isListed: true,
                isDeleted: false
            });

            if (matchingCategory) {
                query.applicableTo = matchingCategory._id;
            }
        }

        query = { ...query, $or: searchConditions };

        const offers = await Offer.find(query)
            .populate({
                path: 'applicableTo',
                select: 'categoryName productName brandName name',
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalOffers = await Offer.countDocuments(query);
        const totalPages = Math.ceil(totalOffers / limit);

        res.render('offers', {
            offers,
            search,
            offerType,
            sortBy,
            page: parseInt(page),
            totalPages,
            sortOptions: [
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'offer_name', label: 'Offer Name (A-Z)' },
                { value: 'offer_name_desc', label: 'Offer Name (Z-A)' },
                { value: 'category_name', label: 'Category Name (A-Z)' },
                { value: 'category_name_desc', label: 'Category Name (Z-A)' },
                { value: 'product_name', label: 'Product Name (A-Z)' },
                { value: 'product_name_desc', label: 'Product Name (Z-A)' },
                { value: 'discount_high', label: 'Discount (High to Low)' },
                { value: 'discount_low', label: 'Discount (Low to High)' }
            ]
        });
    } catch (error) {
        console.error('Error fetching offers:', error);
        res.status(500).render('error', { message: 'An error occurred while fetching offers' });
    }
};



const listOffer = async (req, res) => {
    try {
        const { id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid offer ID' });
        }

        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        if (offer.isDeleted) {
            return res.status(400).json({ error: 'Cannot list a deleted offer' });
        }

        offer.isListed = true;
        await offer.save();

        res.status(200).json({ message: 'Offer listed successfully' });
    } catch (error) {
        console.error('Error listing offer:', error);
        res.status(500).json({ error: 'An error occurred while listing the offer' });
    }
};



const unlistOffer = async (req, res) => {
    try {
        const { id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid offer ID' });
        }

        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        if (offer.isDeleted) {
            return res.status(400).json({ error: 'Cannot unlist a deleted offer' });
        }

        offer.isListed = false;
        await offer.save();

        res.status(200).json({ message: 'Offer unlisted successfully' });
    } catch (error) {
        console.error('Error unlisting offer:', error);
        res.status(500).json({ error: 'An error occurred while unlisting the offer' });
    }
};


const deleteOffer = async (req, res) => {
    try {
        const { id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid offer ID' });
        }

        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        offer.isDeleted = true;
        await offer.save();

        res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Error deleting offer:', error);
        res.status(500).json({ error: 'An error occurred while deleting the offer' });
    }
};


const getAddOffer = async(req,res)=>{
    try{
       
        const product = await Product.find({})
        const category = await Category.find({})
        return res.render("addOffer",{product,category})
    } catch (error) {
       console.log(error);
       return res.status(500).json({success:true,message:"Internal Server"})
    }
}

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
            offerTypeRef
        } = req.body;

        if (!offerName || !description || !discountType || !discountAmount || !validFrom || !validUpto || !offerType || !applicableTo || !offerTypeRef) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        if (offerType === "percentage") {
            if (discountAmount > 50) {
                return res.status(400).json({ success: false, message: "Discount Percentage Invalid. Only up to 50% is allowed!" });
            }
        }

        if (offerName.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Offer name must be at least 3 characters long' });
        }

        if (description.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Description must be at least 10 characters long' });
        }

        if (!discountType) {
            return res.status(400).json({ success: false, message: 'Invalid discount type'})
        }

        const discount = parseFloat(discountAmount);
        if (isNaN(discount) || discount <= 0) {
            return res.status(400).json({ success: false, message: 'Discount amount must be greater than zero' });
        }

        if (discountType === 'percentage') {
            if (discount > 50) {
                return res.status(400).json({ success: false, message: 'Discount percentage cannot exceed 50%' });
            }
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validFromDate = new Date(validFrom);
        const validUptoDate = new Date(validUpto);

        if (isNaN(validFromDate.getTime()) || isNaN(validUptoDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        if (validFromDate < today) {
            return res.status(400).json({ success: false, message: 'Valid from date cannot be in the past' });
        }

        if (validUptoDate <= validFromDate) {
            return res.status(400).json({ success: false, message: 'Valid until date must be after valid from date' });
        }

        const validOfferTypes = ['Category', 'Product'];
        if (!validOfferTypes.includes(offerType) || !validOfferTypes.includes(offerTypeRef)) {
            return res.status(400).json({ success: false, message: 'Invalid offer type' });
        }

        if (offerType !== offerTypeRef) {
            return res.status(400).json({ success: false, message: 'offerType and offerTypeRef must match' });
        }

        if (!mongoose.Types.ObjectId.isValid(applicableTo)) {
            return res.status(400).json({ success: false, message: 'Invalid applicableTo ID' });
        }

        let modelName;
        if (offerType === 'Category') modelName = 'Category';
        else if (offerType === 'Product') modelName = 'Product';

        const Model = mongoose.model(modelName);
        const exists = await Model.findById(applicableTo);
        if (!exists) {
            return res.status(400).json({ success: false, message: `${offerType} not found` });
        }

        const existingOffer = await Offer.findOne({ offerName: offerName.trim(), isDeleted: false });
        if (existingOffer) {
            return res.status(400).json({ success: false, message: 'Offer name already exists' });
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
            isDeleted: false
        });

        await newOffer.save();

        res.status(201).json({
            success: true,
            message: 'Offer added successfully',
            offer: newOffer
        });

    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).json({ success: false, message: 'An error occurred while adding the offer' });
    }
};



const getEditOffer = async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).render('error', { message: 'Offer ID is required' });
      }
  
      const offer = await Offer.findById(id).populate('applicableTo');
      if (!offer) {
        return res.status(404).render('error', { message: 'Offer not found' });
      }
  
      const categories = await Category.find({});
      const products = await Product.find({});
  
      return res.render('editOffer', { offer, category: categories, product: products });
    } catch (error) {
      console.error('Error in getEditOffer:', error);
      return res.status(500).render('error', { message: 'Internal server error' });
    }
  };

  const editOffer = async (req, res) => {
    try {
      const { id } = req.params;
  
      // Validate offer ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid offer ID format' });
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
        offerTypeRef
      } = req.body;
  
      // Validate offerName
      if (!offerName || typeof offerName !== 'string' || offerName.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Offer name must be a string with at least 3 characters' });
      }
  
      // Validate discountType
      if (!['percentage', 'flat'].includes(discountType)) {
        return res.status(400).json({ success: false, message: 'Discount type must be "percentage" or "flat"' });
      }
  
      // Validate discountAmount
      if (typeof discountAmount !== 'number' || discountAmount <= 0 || isNaN(discountAmount)) {
        return res.status(400).json({ success: false, message: 'Discount amount must be a positive number' });
      }
  
      // Limit percentage discount to 50%
      if (discountType === 'percentage' && discountAmount > 50) {
        return res.status(400).json({ success: false, message: 'Percentage discount cannot exceed 50%' });
      }
  
      // Validate dates
      const fromDate = new Date(validFrom);
      const uptoDate = new Date(validUpto);
      if (isNaN(fromDate) || isNaN(uptoDate)) {
        return res.status(400).json({ success: false, message: 'Invalid validFrom or validUpto date format' });
      }
      if (fromDate >= uptoDate) {
        return res.status(400).json({ success: false, message: 'validUpto must be after validFrom' });
      }
  
      // Normalize and validate offerType
      const allowedOfferTypes = ['Product', 'Category', 'Sitewide'];
      const normalizedOfferType = offerType.charAt(0).toUpperCase() + offerType.slice(1).toLowerCase();
      if (!allowedOfferTypes.includes(normalizedOfferType)) {
        return res.status(400).json({ success: false, message: 'Offer type must be "Product", "Category", or "Sitewide"' });
      }
  
      // Normalize applicableTo into an array of ObjectIds
      let applicableToArray = Array.isArray(applicableTo) ? applicableTo : [applicableTo].filter(Boolean);
      if (applicableToArray.length === 0) {
        return res.status(400).json({ success: false, message: 'applicableTo must contain at least one valid ID' });
      }
  
      applicableToArray = applicableToArray.map(id => id.toString().trim());
      for (const id of applicableToArray) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ success: false, message: `Invalid ObjectId in applicableTo: ${id}` });
        }
      }
  
      // Normalize offerTypeRef
      let normalizedOfferTypeRef = offerTypeRef;
      if (offerTypeRef) {
        const allowedRefs = ['Product', 'Category'];
        normalizedOfferTypeRef = offerTypeRef.charAt(0).toUpperCase() + offerTypeRef.slice(1).toLowerCase();
        if (!allowedRefs.includes(normalizedOfferTypeRef)) {
          return res.status(400).json({ success: false, message: 'offerTypeRef must be "Product" or "Category"' });
        }
      }
  
      // Prepare update object
      const updateData = {
        offerName: offerName.trim(),
        description: description?.trim() || '',
        discountType,
        discountAmount,
        validFrom: fromDate,
        validUpto: uptoDate,
        offerType: normalizedOfferType,
        applicableTo: applicableToArray.map(id => new mongoose.Types.ObjectId(id)),
        ...(normalizedOfferTypeRef && { offerTypeRef: normalizedOfferTypeRef })
      };
  
      // Update offer in DB
      const updatedOffer = await Offer.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
  
      if (!updatedOffer) {
        return res.status(404).json({ success: false, message: 'Offer not found' });
      }
  
      res.json({
        success: true,
        message: 'Offer updated successfully',
        data: updatedOffer
      });
  
    } catch (error) {
      console.error('Error updating offer:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update offer'
      });
    }
  };
  


module.exports={
    getOfferPage,
    getAddOffer,
    addOffer,
    listOffer,
    unlistOffer,
    deleteOffer,
    getEditOffer,
    editOffer
    

}