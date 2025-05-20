const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const sharp = require("sharp"); //this module for resize the images
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const cloudinary = require("../../config/cloudinary");


const productInfo = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 7; // Changed from 5 to 7 to display 7 products per page

    const searchConditions = [
      { productName: { $regex: new RegExp(search, "i") } },
      { gender: { $regex: new RegExp(search, "i") } },
      { brand: { $regex: new RegExp(search, "i") } },
    ];

    if (/\d+ml/i.test(search)) {
      searchConditions.push({ "variants.size": { $regex: new RegExp(search, "i") } });
    }

    // Get only listed + not-deleted categories
    const listedCategories = await Category.find({ isListed: true, isDeleted: false });
    const validCategoryIds = listedCategories.map(cat => cat._id);

    // Check if search matches a listed + not-deleted category
    if (search) {
      const matchingCategory = await Category.findOne({
        name: { $regex: new RegExp(search, "i") },
        isListed: true,
        isDeleted: false,
      });
      if (matchingCategory) {
        searchConditions.push({ category: matchingCategory._id });
      }
    }

    const productData = await Product.find({
      $or: searchConditions,
      category: { $in: validCategoryIds },
    })
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.countDocuments({
      $or: searchConditions,
      category: { $in: validCategoryIds },
    });

    const totalPages = Math.ceil(count / limit);

    res.render("product", {
      data: productData,
      totalPages,
      currentPage: page,
      cat: listedCategories,
    });
  } catch (error) {
    console.error("Error in productInfo:", error);
    res.redirect('/admin/pageError');
  }
};


const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true, isDeleted: false });
    console.log('Fetched categories:', category);
    res.render('add-product', { cat: category });
  } catch (error) {
    console.error('Error in addProductPage:', error);
    res.redirect('/admin/pageError');
  }
};

const addProducts = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded files:', req.files);

    const products = req.body;

    // Validate productName
    const productName = products.productName ? products.productName.trim() : '';
    if (!productName) {
      console.log('Validation failed: Product name is empty');
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    if (!/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(productName)) {
      console.log('Validation failed: Invalid product name format');
      return res.status(400).json({ success: false, message: 'Product name must contain only letters, spaces, or hyphens, and include at least one letter' });
    }
    if (productName.length < 3 || productName.length > 100) {
      console.log('Validation failed: Product name length');
      return res.status(400).json({ success: false, message: 'Product name must be between 3 and 100 characters' });
    }

    // Check if product already exists
    const productExists = await Product.findOne({
      productName: { $regex: `^${productName}$`, $options: 'i' },
      isDeleted: false,
    });
    if (productExists) {
      console.log('Validation failed: Product already exists');
      return res.status(400).json({ success: false, message: 'Product already exists, please try with another name' });
    }

    // Validate shortDescription
    const shortDescription = products.shortDescription ? products.shortDescription.trim() : '';
    if (!shortDescription) {
      console.log('Validation failed: Short description is empty');
      return res.status(400).json({ success: false, message: 'Short description is required' });
    }
    if (shortDescription.length < 10 || shortDescription.length > 200) {
      console.log('Validation failed: Short description length');
      return res.status(400).json({ success: false, message: 'Short description must be between 10 and 200 characters' });
    }

    // Validate other required fields
    const requiredFields = [
      { field: products.description, name: 'Description' },
      { field: products.gender, name: 'Gender' },
      { field: products.brand, name: 'Brand' },
      { field: products.productType, name: 'Fragrance Type' },
      { field: products.fragranceFamily, name: 'Fragrance Family' },
      { field: products.usage, name: 'Usage' },
      { field: products.longevity, name: 'Fragrance Longevity' },
    ];

    for (const { field, name } of requiredFields) {
      if (!field || field.trim() === '') {
        console.log(`Validation failed: ${name} is empty`);
        return res.status(400).json({ success: false, message: `${name} is required` });
      }
    }

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(products.category)) {
      console.log('Validation failed: Invalid category ID');
      return res.status(400).json({ success: false, message: 'Invalid category ID' });
    }
    const categoryExists = await Category.findOne({ _id: products.category, isListed: true, isDeleted: false });
    if (!categoryExists) {
      console.log('Validation failed: Category does not exist or is not listed');
      return res.status(400).json({ success: false, message: 'Selected category does not exist or is not listed' });
    }

    // Upload images to Cloudinary
    const images = [];
    if (req.files && req.files.length > 0) {
      const allowedFormats = ['image/png', 'image/jpeg', 'image/webp'];
      for (const file of req.files) {
        if (!allowedFormats.includes(file.mimetype)) {
          console.log('Validation failed: Invalid image format', file.mimetype);
          return res.status(400).json({ success: false, message: 'Only PNG, JPEG, and WebP image formats are supported' });
        }
      }

      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'product-images',
              transformation: [
                { width: 440, height: 440, crop: 'fill' },
                { quality: 90, fetch_format: 'auto' },
              ],
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload success:', result.secure_url);
                resolve(result);
              }
            }
          );
          stream.end(file.buffer);
        });
        images.push(uploaded.secure_url);
      }
    }

    if (images.length < 3 || images.length > 5) {
      console.log('Validation failed: Invalid image count', images.length);
      return res.status(400).json({ success: false, message: 'Please upload between 3 and 5 images' });
    }

    // Process and validate variants
    let rawVariants = products.variants;
    if (typeof rawVariants === 'string') {
      try {
        rawVariants = JSON.parse(rawVariants);
      } catch (error) {
        console.log('Validation failed: Invalid variants format', error);
        return res.status(400).json({ success: false, message: 'Invalid variants format' });
      }
    }

    const variants = [];
    const sizes = [];
    if (rawVariants && Array.isArray(rawVariants)) {
      for (let i = 0; i < rawVariants.length; i++) {
        const { size, salePrice, quantity, sku } = rawVariants[i];

        if (!size || !quantity || !sku || salePrice === undefined) {
          console.log(`Validation failed: Missing fields in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `Missing required fields in variant ${i + 1}` });
        }

        const sizeTrimmed = size.trim();
        if (!sizeTrimmed) {
          console.log(`Validation failed: Size is empty in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `Size is required in variant ${i + 1}` });
        }
        sizes.push(sizeTrimmed);

        const skuTrimmed = sku.trim();
        if (!skuTrimmed) {
          console.log(`Validation failed: SKU is empty in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `SKU is required in variant ${i + 1}` });
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(skuTrimmed)) {
          console.log(`Validation failed: Invalid SKU format in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `SKU should contain only alphanumeric characters, hyphens, and underscores in variant ${i + 1}` });
        }

        const quantityNum = parseInt(quantity);
        if (isNaN(quantityNum) || quantityNum < 0) {
          console.log(`Validation failed: Invalid quantity in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `Quantity must be a valid non-negative number in variant ${i + 1}` });
        }

        const salePriceStr = salePrice.toString().trim();
        if (!/^(?!0\d)\d+(\.\d{1,2})?$/.test(salePriceStr) || parseFloat(salePriceStr) <= 0) {
          console.log(`Validation failed: Invalid sale price in variant ${i + 1}`);
          return res.status(400).json({ success: false, message: `Sale price must be a valid number greater than 0, without leading zeros in variant ${i + 1}` });
        }
        const salePriceNum = parseFloat(salePriceStr);

        variants.push({
          size: sizeTrimmed,
          regularPrice: salePriceNum,
          salePrice: salePriceNum,
          quantity: quantityNum,
          sku: skuTrimmed,
        });
      }
    }

    if (variants.length === 0) {
      console.log('Validation failed: No variants provided');
      return res.status(400).json({ success: false, message: 'At least one product variant is required' });
    }

    const uniqueSizes = [...new Set(sizes)];
    if (sizes.length !== uniqueSizes.length) {
      console.log('Validation failed: Duplicate sizes detected');
      return res.status(400).json({ success: false, message: 'Each variant must have a unique size' });
    }

    // Create new product
    const newProduct = new Product({
      productName,
      shortDescription,
      description: products.description.trim(),
      gender: products.gender.trim(),
      brand: products.brand.trim(),
      productType: products.productType.trim(),
      fragranceFamily: products.fragranceFamily.trim(),
      usage: products.usage.trim(),
      category: products.category,
      longevity: products.longevity.trim(),
      productImage: images,
      variants,
      status: 'Available',
    });

    await newProduct.save();
    console.log('Product saved:', newProduct);

    return res.status(200).json({ success: true, message: 'Product added successfully' });
  } catch (error) {
    console.error('Error saving product:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

const blockProduct = async(req,res)=>{
   try {
      const {id}=req.query
      console.log(req.query);
      
      const product = await Product.findByIdAndUpdate(id,{$set:{isBlocked:true}})
      if(product){
        return res.status(200).json({success:true,message:"product blocked"})
      }
    
      res.redirect("/admin/product")
    } catch (error) {
      
       res.redirect('/admin/pageError');
   }
}

const unblockProduct = async(req,res)=>{
   try{
      
    const {id}=req.query
    const product = await Product.findByIdAndUpdate(id,{$set:{isBlocked:false}})
    if(product){
      return res.status(200).json({success:true,message:"product blocked"})
    }
  
   if(product){
    return res.status(200).json({success:true})
 
   }
  
   }catch(error){
      res.redirect('/admin/pageError');
   }
   
}


const deleteProduct = async (req,res) =>{
  try{
    const {id}= req.query

   const delet=  await Product.findByIdAndUpdate(
    id,
    {$set:{isDeleted:true}}
   )

   if(delet){
    return res.status(200).json({success:true,message:"delete success"})

   }
   
  }catch(error){
    
    return res.status(500).json({success:false,message:"Internal server error"})
  }
 
}




const editProductPage = async(req,res)=>{
   try {
      const id = req.query.id;
      
      if (!id) {
         console.error("No product ID provided");
         return res.redirect("/pageError");
      }
      const product = await Product.findById(id).populate('category');
      const categories = await Category.find({isListed: true, isDeleted:false});
      if (!product) {
         console.error("Product not found with ID:", id);
         return res.redirect("/pageError");
      }
      console.log("Found product:", product.productName); 
      res.render("edit-product", {
         product: product,
         categories: categories
      });
   } catch (error) {
      console.error("Error loading edit product page:", error);
      res.redirect('/admin/pageError');
   }
}


const editProduct = async (req, res) => {
  try {
    const productId = req.body.productId;
    const productData = req.body;

    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    // Find existing product
    const product = await Product.findById(productId);
    if (!product) {
      console.error('Product not found with ID:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate productName
    const productName = productData.productName ? productData.productName.trim() : '';
    if (!productName) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required',
      });
    }
    if (!/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(productName)) {
      return res.status(400).json({
        success: false,
        message: 'Product name must contain only letters, spaces, or hyphens, and include at least one letter',
      });
    }
    if (productName.length < 3 || productName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Product name must be between 3 and 100 characters',
      });
    }

    // Check if product name already exists (excluding the current product)
    const productExists = await Product.findOne({
      productName: { $regex: `^${productName}$`, $options: 'i' },
      isDeleted: false,
      _id: { $ne: productId },
    });
    if (productExists) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists, please try with another name',
      });
    }

    // Validate shortDescription
    const shortDescription = productData.shortDescription ? productData.shortDescription.trim() : '';
    if (!shortDescription) {
      return res.status(400).json({
        success: false,
        message: 'Short description is required',
      });
    }
    if (shortDescription.length < 10 || shortDescription.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Short description must be between 10 and 200 characters',
      });
    }

    // Validate other required fields
    const requiredFields = [
      { field: productData.description, name: 'Description' },
      { field: productData.gender, name: 'Gender' },
      { field: productData.brand, name: 'Brand' },
      { field: productData.productType, name: 'Fragrance Type' },
      { field: productData.fragranceFamily, name: 'Fragrance Family' },
      { field: productData.usage, name: 'Usage' },
      { field: productData.longevity, name: 'Fragrance Longevity' },
    ];

    for (const { field, name } of requiredFields) {
      if (!field || field.trim() === '') {
        return res.status(400).json({
          success: false,
          message: `${name} is required`,
        });
      }
    }

    // Validate category ID if provided
    if (productData.category) {
      if (!mongoose.Types.ObjectId.isValid(productData.category)) {
        console.error('Invalid category ID:', productData.category);
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        });
      }
      const category = await Category.findById(productData.category);
      if (!category) {
        console.error('Category not found:', productData.category);
        return res.status(400).json({
          success: false,
          message: 'Invalid category. Please select a valid category.',
        });
      }
    }

    // Handle images
    const images = [];
    const existingImages = productData.existingImages
      ? Object.values(productData.existingImages).filter(img => img)
      : [];
    const removedImages = productData.removedImages && typeof productData.removedImages === 'string'
      ? productData.removedImages.split(',').filter(img => img.trim())
      : [];

    console.log('Existing images from form:', existingImages);
    console.log('Removed images:', removedImages);

    // Keep existing images that are not removed
    for (const image of existingImages) {
      if (image && !removedImages.includes(image)) {
        images.push(image);
        console.log(`Keeping existing image: ${image}`);
      }
    }

    // Delete removed images from Cloudinary
    for (const imgToRemove of removedImages) {
      if (!imgToRemove || imgToRemove.trim() === '') continue;
      try {
        const publicId = imgToRemove.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`product-images/${publicId}`);
        console.log('Deleted image from Cloudinary:', imgToRemove);
      } catch (err) {
        console.error('Error deleting image from Cloudinary:', err);
      }
    }

    // Upload new images to Cloudinary with high quality
    if (req.files && req.files.length > 0) {
      console.log('Processing new images:', req.files.length);

      // Validate image formats
      const allowedFormats = ['image/png', 'image/jpeg', 'image/webp'];
      for (const file of req.files) {
        if (!allowedFormats.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: 'Only PNG, JPEG, and WebP image formats are supported',
          });
        }
      }

      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'product-images',
              transformation: [
                { width: 1200, height: 1200, crop: 'fill' },
                { quality: 90, fetch_format: 'auto' },
              ],
              progressive: 'semi',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        images.push(uploaded.secure_url);
        console.log('Uploaded new image to Cloudinary:', uploaded.secure_url);
      }
    }

    // Validate image count (3-5 images)
    if (images.length < 3 || images.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please upload between 3 and 5 images',
      });
    }

    // Parse and process variants
    const rawVariants = productData.variants || {};
    const variants = [];
    const sizes = [];

    // Convert the variants object into an array
    Object.keys(rawVariants).forEach(index => {
      const variant = rawVariants[index];
      const { size, salePrice, quantity, sku } = variant;

      // Validate required fields
      if (!size || !salePrice || !quantity || !sku) {
        return res.status(400).json({
          success: false,
          message: `Missing required fields in variant ${parseInt(index) + 1}`,
        });
      }

      // Validate size
      const sizeTrimmed = size.trim();
      if (!sizeTrimmed) {
        return res.status(400).json({
          success: false,
          message: `Size is required in variant ${parseInt(index) + 1}`,
        });
      }
      sizes.push(sizeTrimmed);

      // Validate SKU
      const skuTrimmed = sku.trim();
      if (!skuTrimmed) {
        return res.status(400).json({
          success: false,
          message: `SKU is required in variant ${parseInt(index) + 1}`,
        });
      }
      if (!/^[a-zA-Z0-9-_]+$/.test(skuTrimmed)) {
        return res.status(400).json({
          success: false,
          message: `SKU should contain only alphanumeric characters, hyphens, and underscores in variant ${parseInt(index) + 1}`,
        });
      }

      // Validate quantity
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum < 0) {
        return res.status(400).json({
          success: false,
          message: `Quantity must be a valid non-negative number in variant ${parseInt(index) + 1}`,
        });
      }

      // Validate salePrice
      const salePriceStr = salePrice.toString().trim();
      if (!/^(?!0\d)\d+(\.\d{1,2})?$/.test(salePriceStr) || parseFloat(salePriceStr) <= 0) {
        return res.status(400).json({
          success: false,
          message: `Price must be a valid number greater than 0, without leading zeros in variant ${parseInt(index) + 1}`,
        });
      }
      const salePriceNum = parseFloat(salePriceStr);

      variants.push({
        size: sizeTrimmed,
        salePrice: salePriceNum,
        quantity: quantityNum,
        sku: skuTrimmed,
      });
    });

    // Validate variants count
    if (variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one product variant is required',
      });
    }

    // Check for duplicate sizes
    const uniqueSizes = [...new Set(sizes)];
    if (sizes.length !== uniqueSizes.length) {
      return res.status(400).json({
        success: false,
        message: 'Each variant must have a unique size',
      });
    }

    // Prepare update data for PATCH
    const updateData = {
      ...(productData.productName && { productName: productData.productName }),
      ...(productData.shortDescription && { shortDescription: productData.shortDescription }),
      ...(productData.description && { description: productData.description }),
      ...(productData.gender && { gender: productData.gender }),
      ...(productData.brand && { brand: productData.brand }),
      ...(productData.productType && { productType: productData.productType }),
      ...(productData.fragranceFamily && { fragranceFamily: productData.fragranceFamily }),
      ...(productData.usage && { usage: productData.usage }),
      ...(productData.category && { category: productData.category }),
      ...(productData.longevity && { longevity: productData.longevity }),
      ...(productData.productOffer && { productOffer: parseInt(productData.productOffer) || 0 }),
      productImage: images,
      variants,
      ...(productData.status && { status: productData.status }),
      updatedAt: new Date(),
    };

    console.log('Update data:', JSON.stringify(updateData, null, 2));

    // Update product using PATCH semantics and remove regularPrice field from variants
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        $set: updateData,
        $unset: { 'variants.$[].regularPrice': '' }, // Remove regularPrice field from all variants
      },
      { new: true, runValidators: true }
    );

    if (updatedProduct) {
      console.log('Product updated successfully:', updatedProduct._id);
      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
      });
    } else {
      console.error('Failed to update product');
      return res.status(400).json({
        success: false,
        message: 'Failed to update product',
      });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: `Internal Server Error: ${error.message}`,
    });
  }
};



module.exports = {
   productInfo,
   addProductPage,
   addProducts,
  blockProduct,
  unblockProduct,
  deleteProduct,
  editProductPage,
  editProduct
};

