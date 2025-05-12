const Coupons = require("../../models/couponSchema");
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day); // month is 0-based in JS
  return isNaN(date.getTime()) ? null : date;
};

// GET /admin/coupons
const getCouponsPage = async (req, res) => {
  try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'newest';
      const dateFrom = req.query.dateFrom || '';
      const dateTo = req.query.dateTo || '';

      // Build search query
      const searchQuery = {
          isDeleted: false
      };

      if (search) {
          searchQuery.$or = [
              { couponName: { $regex: search, $options: 'i' } },
              { couponCode: { $regex: search, $options: 'i' } }
          ];
      }

      // Parse dates and add date range filter
      const parsedDateFrom = parseDate(dateFrom);
      const parsedDateTo = parseDate(dateTo);

      if (parsedDateFrom && parsedDateTo) {
          searchQuery.startDate = { $gte: parsedDateFrom };
          searchQuery.endDate = { $lte: parsedDateTo };
      } else if (parsedDateFrom) {
          searchQuery.startDate = { $gte: parsedDateFrom };
      } else if (parsedDateTo) {
          searchQuery.endDate = { $lte: parsedDateTo };
      }

      // Define sort options
      let sortOptions = {};
      switch (sortBy) {
          case 'newest':
              sortOptions = { startDate: -1 };
              break;
          case 'oldest':
              sortOptions = { startDate: 1 };
              break;
          case 'name_asc':
              sortOptions = { couponName: 1 };
              break;
          case 'name_desc':
              sortOptions = { couponName: -1 };
              break;
          case 'price_high':
              sortOptions = { offerPrice: -1 };
              break;
          case 'price_low':
              sortOptions = { offerPrice: 1 };
              break;
          default:
              sortOptions = { startDate: -1 };
      }

      // Fetch total count and coupons
      const totalCoupons = await Coupons.countDocuments(searchQuery);
      const totalPages = Math.ceil(totalCoupons / limit);

      const coupons = await Coupons.find(searchQuery)
          .sort(sortOptions)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

      // Format coupons with dates and status
      const formattedCoupons = coupons.map(coupon => ({
          ...coupon,
          startDateFormatted: coupon.startDate
              ? new Date(coupon.startDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
              : 'Invalid Date',
          endDateFormatted: coupon.endDate
              ? new Date(coupon.endDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })
              : 'Invalid Date',
          status: coupon.endDate && new Date(coupon.endDate) >= new Date() ? 'Valid' : 'Expired'
      }));

      // Render the EJS template
      res.render('coupons', {
          coupons: formattedCoupons,
          currentPage: page,
          totalPages,
          search,
          sortBy,
          dateFrom,
          dateTo
      });
  } catch (error) {
      console.error('Error in getCouponsPage:', error);
      res.status(500).render('admin/error', {
          message: 'An error occurred while fetching coupons.',
          error
      });
  }
};


  

const getAddCouponPage = (req,res)=>{
    try{
       return res.render("addCoupon")
    }catch(error){
     console.log(error);
    
    }
    
}


const addCoupon = async (req, res) => {
  try {
      const { name, code, createdAt, expireOn, offerPrice, minimumPrice, description } = req.body;

      // Validate required fields
      if (!name || !code || !createdAt || !expireOn || !offerPrice || !minimumPrice || !description) {
          return res.status(400).json({ success: false, message: "All fields are required" });
      }

      // Validate name (letters and spaces only)
      if (!/^[a-zA-Z\s]+$/.test(name)) {
          return res.status(400).json({ success: false, message: "Coupon name can only contain letters and spaces" });
      }

      // Validate name length
      if (name.length < 3 || name.length > 50) {
          return res.status(400).json({ success: false, message: "Coupon name must be 3-50 characters long" });
      }

      // Validate coupon code format (uppercase letters and numbers)
      if (!/^[A-Z0-9]{5,12}$/.test(code)) {
          return res.status(400).json({ success: false, message: "Coupon code must be 5-12 uppercase letters or numbers" });
      }

      // Validate prices
      if (offerPrice <= 0 || minimumPrice <= 0) {
          return res.status(400).json({ success: false, message: "Offer price and minimum price must be greater than 0" });
      }

      if (offerPrice >= minimumPrice) {
          return res.status(400).json({ success: false, message: "Offer price must be less than minimum price" });
      }

      // Validate offer price <= 30% of minimum price
      const maxOfferPrice = minimumPrice * 0.3;
      if (offerPrice > maxOfferPrice) {
          return res.status(400).json({ 
              success: false, 
              message: `Offer price cannot exceed 30% of minimum price (${maxOfferPrice.toFixed(2)})` 
          });
      }

      // Validate dates
      const createdAtDate = new Date(createdAt);
      const expireOnDate = new Date(expireOn);

      if (isNaN(createdAtDate.getTime()) || isNaN(expireOnDate.getTime())) {
          return res.status(400).json({ success: false, message: "Invalid date format" });
      }

      if (expireOnDate <= createdAtDate) {
          return res.status(400).json({ success: false, message: "Expiry date must be after created date" });
      }

      // Check for existing coupon name (case-insensitive)
      const existingName = await Coupons.findOne({ 
          couponName: { $regex: `^${name}$`, $options: 'i' } 
      });
      if (existingName) {
          return res.status(400).json({ success: false, message: "Coupon name already exists" });
      }

      // Check for existing coupon code (case-insensitive)
      const existingCode = await Coupons.findOne({ 
          couponCode: { $regex: `^${code}$`, $options: 'i' } 
      });
      if (existingCode) {
          return res.status(400).json({ success: false, message: "Coupon code already exists" });
      }

      const coupon = {
          couponName: name,
          description,
          couponCode: code,
          startDate: createdAtDate,
          endDate: expireOnDate,
          offerPrice,
          minimumPrice
      };

      const newCoupon = await Coupons.create(coupon);

      return res.status(201).json({ 
          success: true, 
          message: "Coupon created successfully", 
          data: newCoupon 
      });

  } catch (error) {
      console.error("Error creating coupon:", error);
      if (error.code === 11000) { // MongoDB duplicate key error
          const field = Object.keys(error.keyValue)[0];
          return res.status(400).json({ 
              success: false, 
              message: `${field} already exists` 
          });
      }
      return res.status(500).json({ 
          success: false, 
          message: "Internal Server Error" 
      });
  }
};
 


const listOrUnlist = async(req,res)=>{
    try{
        const {id}=req.params
        const {isListed}=req.body      
        if(!id && !isListed){
            return res.status(500).json({success:false,message:"Internal Server error!"})
        }
        const couponUpdate = await Coupons.findByIdAndUpdate(id,{$set:{isListed:isListed}},{new:true})
        
        if(!couponUpdate){
            return res.status(500).json({success:false,message: "Coupon not found"})
        }
        
        return res.status(200).json({json:true, message: `Coupon has been ${isListed ? 'listed' : 'unlisted'} successfully`,coupon: couponUpdate
        });
        
    }catch(error){
        console.error('Error updating coupon:', error);
        return res.status(500).json({
        success: false,
        message: "Internal Server Error"
        });

    }
}

const getEditCoupon = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Coupon ID is required" });
    }

    const coupon = await Coupons.findById(id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon does not exist" });
    }

    return res.render("editCoupon", { coupon });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { couponName, couponCode, startDate, description, endDate, offerPrice, minimumPrice } = req.body;

    // Validate required fields
    if (!couponName || !couponCode || !startDate || !description || !endDate || !offerPrice || !minimumPrice) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate name (letters and spaces only)
    if (!/^[a-zA-Z\s]+$/.test(couponName)) {
      return res.status(400).json({ success: false, message: "Coupon name can only contain letters and spaces" });
    }

    // Validate name length
    if (couponName.length < 3 || couponName.length > 50) {
      return res.status(400).json({ success: false, message: "Coupon name must be 3-50 characters long" });
    }

    // Validate coupon code format (uppercase letters and numbers)
    if (!/^[A-Z0-9]{5,12}$/.test(couponCode)) {
      return res.status(400).json({ success: false, message: "Coupon code must be 5-12 uppercase letters or numbers" });
    }

    // Validate prices
    const offerPriceNum = parseFloat(offerPrice);
    const minimumPriceNum = parseFloat(minimumPrice);

    if (offerPriceNum <= 0) {
      return res.status(400).json({ success: false, message: "Offer price must be greater than zero" });
    }
    if (minimumPriceNum <= 0) {
      return res.status(400).json({ success: false, message: "Minimum price must be greater than zero" });
    }
    if (offerPriceNum >= minimumPriceNum) {
      return res.status(400).json({ success: false, message: "Offer price must be less than minimum price" });
    }
    if (offerPriceNum > minimumPriceNum * 0.3) {
      return res.status(400).json({
        success: false,
        message: `Offer price cannot exceed 30% of minimum purchase amount (${(minimumPriceNum * 0.3).toFixed(2)})`,
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    // Check for existing coupon
    const existingCoupon = await Coupons.findById(id);
    if (!existingCoupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    // Check for duplicate name (case-insensitive)
    const duplicateName = await Coupons.findOne({
      couponName: { $regex: `^${couponName}$`, $options: 'i' },
      _id: { $ne: id },
    });
    if (duplicateName) {
      return res.status(400).json({ success: false, message: "Coupon name already exists" });
    }

    // Check for duplicate code (case-insensitive)
    const duplicateCode = await Coupons.findOne({
      couponCode: { $regex: `^${couponCode}$`, $options: 'i' },
      _id: { $ne: id },
    });
    if (duplicateCode) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }

    // Update coupon
    const updatedCoupon = await Coupons.findByIdAndUpdate(
      id,
      {
        couponName,
        couponCode,
        startDate,
        description,
        endDate,
        offerPrice: offerPriceNum,
        minimumPrice: minimumPriceNum,
      },
      { new: true, runValidators: true }
    );

    if (!updatedCoupon) {
      return res.status(500).json({ success: false, message: "Failed to update coupon" });
    }

    res.status(200).json({ success: true, message: "Coupon updated successfully", coupon: updatedCoupon });
  } catch (error) {
    console.error("Error updating coupon:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


  const deleteCoupon = async (req, res) => {
    try {
      const { id } = req.query;
  
      if (!id) {
        return res.status(400).json({ success: false, message: 'Coupon ID not provided!' });
      }

      console.log(23);
      
  
      const deletedCoupon = await Coupons.findByIdAndUpdate(
        id,
        { $set: { isDeleted: true } },
        { new: true }
      );
      if (!deletedCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found!' });
      }
      return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  };

  


module.exports={
    getCouponsPage,
    getAddCouponPage,
    addCoupon,
    listOrUnlist,
    getEditCoupon,
    editCoupon,
    deleteCoupon
}