const Coupons = require("../../models/couponSchema");
const { login } = require("./adminController");

const getCouponsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const search = req.query.search || '';
        const sortBy = req.query.sortBy || 'newest';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';

        const searchQuery = {
            isDeleted: false,
            $or: [
                { couponName: { $regex: search, $options: 'i' } },
                { couponCode: { $regex: search, $options: 'i' } },
            ],
        };

        // Add date range filter if provided
        if (dateFrom && dateTo) {
            searchQuery.startDate = {
                $gte: new Date(dateFrom),
                $lte: new Date(dateTo)
            };
        } else if (dateFrom) {
            searchQuery.startDate = { $gte: new Date(dateFrom) };
        } else if (dateTo) {
            searchQuery.startDate = { $lte: new Date(dateTo) };
        }

        if (!search) delete searchQuery.$or;

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

        const totalCoupons = await Coupons.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupons = await Coupons.find(searchQuery)
            .sort(sortOptions)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const formattedCoupons = coupons.map(coupon => ({
            ...coupon,
            startDateFormatted: coupon.startDate
                ? new Date(coupon.startDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                  })
                : null,
            endDateFormatted: coupon.endDate
                ? new Date(coupon.endDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                  })
                : null,
        }));

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
        console.error(error);
        res.status(500).send('Server Error');
    }
};


  

const getAddCouponPage = (req,res)=>{
    try{
       return res.render("addCoupon")
    }catch(error){
     console.log(error);
    
    }
    
}


const addCoupon = async(req,res)=>{
    try{
        const { name ,code, createdAt, expireOn, offerPrice, minimumPrice, status ,description} = req.body;
        if (!code || !createdAt || !expireOn || !offerPrice || !minimumPrice || !status ||!name ||!description) {
            return res.status(400).json({success:false, message: "All fields are required" });
        }
        if (offerPrice <= 0 || minimumPrice <= 0) {
            return res.status(400).json({success:false, message: "Offer price and minimum price must be greater than 0" });
        }
        if(offerPrice > minimumPrice && offerPrice === minimumPrice){
            return res.status(400).json({success:false, message: "Offer price and minimum price must be greater than 0" });
        }
        const createdAtDate = new Date(createdAt)
        const expireOnDate = new Date(expireOn)

        if (isNaN(expireOnDate.getTime()) || expireOnDate <= createdAtDate) {
            return res.status(400).json({success:false, message: "Invalid expiration date" });
        }

        const coupon={
            couponName:name,
            description,
            couponCode:code,
            startDate:createdAtDate,
            endDate:expireOnDate,
            offerPrice,
            minimumPrice,
            status
        }

        const newCoupon = await Coupons.create(coupon)

        if(newCoupon){
            return res.status(200).json({success:true,message:"Coupon created Successfully"})
        }

    }catch(error){
        console.log(error);
        return res.status(500).json({success:true,message:"Internal Server Error !"})
        
    }
}




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


const getEditCoupon = async (req,res)=>{
    try{
      const {id}=req.query
      if(!req.query){
        return res.status(400).json({success:false,message:"Coupon id does not get"})
      }

      const coupon = await Coupons.findById(id)
      if(!coupon){
        return res.status(400).json({success:false,message:"Coupon  does not exist!"})
      }
      return res.render("editCoupon",{coupon})

    }catch(error){
        console.log(error);


    }
}



const editCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      couponName,
      couponCode,
      startDate,
      description,
      endDate,
      offerPrice,
      minimumPrice,
    } = req.body;

    // Validate required fields
    if (
      !couponName ||
      !couponCode ||
      !startDate ||
      !description ||
      !endDate ||
      !offerPrice ||
      !minimumPrice
    ) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (end <= start) {
      return res.status(400).json({ success: false, message: 'End date must be after start date' });
    }

    // Validate prices
    const offerPriceNum = parseFloat(offerPrice);
    const minimumPriceNum = parseFloat(minimumPrice);

    if (offerPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Offer price must be greater than zero' });
    }
    if (minimumPriceNum <= 0) {
      return res.status(400).json({ success: false, message: 'Minimum price must be greater than zero' });
    }
    if (offerPriceNum >= minimumPriceNum) {
      return res.status(400).json({ success: false, message: 'Offer price must be less than minimum price' });
    }
    if (offerPriceNum > minimumPriceNum * 0.3) {
      return res.status(400).json({
        success: false,
        message: `Offer price cannot exceed 30% of minimum purchase amount (${(minimumPriceNum * 0.3).toFixed(2)})`,
      });
    }

    // Check for existing coupon
    const existingCoupon = await Coupons.findById(id);
    if (!existingCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    // Check for duplicate name
    const duplicateName = await Coupons.findOne({
      couponName,
      _id: { $ne: id },
    });
    if (duplicateName) {
      return res.status(400).json({ success: false, message: 'Coupon name already exists' });
    }

    // Check for duplicate code
    const duplicateCode = await Coupons.findOne({
      couponCode,
      _id: { $ne: id },
    });
    if (duplicateCode) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
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
      return res.status(500).json({ success: false, message: 'Failed to update coupon' });
    }

    res.status(200).json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
  } catch (error) {
    console.error('Error updating coupon:', error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
    }
    res.status(500).json({ success: false, message: error.message || 'An error occurred while updating the coupon' });
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