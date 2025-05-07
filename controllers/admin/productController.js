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
    const limit = 5;

    const searchConditions = [
      { productName: { $regex: new RegExp(search, "i") }},
      { gender: { $regex: new RegExp(search, "i") }},
      { brand: { $regex: new RegExp(search, "i") }}
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
        isDeleted: false
      });
      if (matchingCategory) {
        searchConditions.push({ category: matchingCategory._id });
      }
    }

    const productData = await Product.find({
      $or: searchConditions,
      category: { $in: validCategoryIds }
    })
    .populate('category')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();

    const count = await Product.countDocuments({
      $or: searchConditions,
      category: { $in: validCategoryIds }
    });

    const totalPages = Math.ceil(count / limit);

    res.render("product", {
      data: productData,
      totalPages,
      currentPage: page,
      cat: listedCategories
    });

  } catch (error) {
    console.error("Error in productInfo:", error);
    res.redirect("/pageError");
  }
};



const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({isListed: true,isDeleted:false});
    res.render("add-product", {
      cat: category,
    });
  } catch (error) {
    res.redirect("/pageError");
  }
};


const addProducts = async (req, res) => {
  try {
    const products = req.body;

    // Check if product already exists
    const productExists = await Product.findOne({
      productName: products.productName,
      isDeleted: false,
    });
    if (productExists) {
      return res.status(400).json({
        success: false,
        message: "Product already exists, please try with another name",
      });
    }

    // Upload images to Cloudinary
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "product-images",
              transformation: [
                { width: 440, height: 440, crop: "fill" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        images.push(uploaded.secure_url);
      }
    }

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }
    console.log(images);
    
    // Parse variants if sent as a string (FormData case)
    let rawVariants = products.variants;
    if (typeof rawVariants === "string") {
      try {
        rawVariants = JSON.parse(rawVariants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid variants format",
        });
      }
    }

    // Process variants
    const variants = [];
    if (rawVariants && Array.isArray(rawVariants)) {
      rawVariants.forEach((variant, index) => {
        const { size, regularPrice, salePrice, quantity, sku } = variant;

        if (!size || !regularPrice || !quantity || !sku) {
          throw new Error(`Missing required fields in variant ${index + 1}`);
        }

        const regularPriceNum = parseFloat(regularPrice);
        const salePriceNum = salePrice ? parseFloat(salePrice) : 0;
        const quantityNum = parseInt(quantity);

        if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
          throw new Error(`Invalid regular price in variant ${index + 1}`);
        }
        if (salePrice && (isNaN(salePriceNum) || salePriceNum < 0)) {
          throw new Error(`Invalid sale price in variant ${index + 1}`);
        }
        if (isNaN(quantityNum) || quantityNum < 0) {
          throw new Error(`Invalid quantity in variant ${index + 1}`);
        }
        if (salePriceNum > 0 && salePriceNum >= regularPriceNum) {
          throw new Error(
            `Sale price must be less than regular price in variant ${index + 1}`
          );
        }

        variants.push({
          size,
          regularPrice: regularPriceNum,
          salePrice: salePriceNum,
          quantity: quantityNum,
          sku,
        });
      });
    }

    if (variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product variant is required",
      });
    }

    // Validate category ID
    if (!mongoose.Types.ObjectId.isValid(products.category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    // Create new product
    const newProduct = new Product({
      productName: products.productName,
      shortDescription: products.shortDescription,
      description: products.description,
      gender: products.gender,
      brand: products.brand,
      productType: products.productType,
      fragranceFamily: products.fragranceFamily,
      usage: products.usage,
      category: products.category,
      longevity: products.longevity,
      productImage: images,
      variants,
      status: "Available",
    });

    await newProduct.save();

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
    });
  } catch (error) {
    console.error("Error saving product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
      
      res.redirect("/pageError")
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
      res.redirect("/pageError")
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
    res.redirect("/pageError")
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
      res.redirect("/pageError");
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
        message: "Invalid product ID",
      });
    }

    // Find existing product
    const product = await Product.findById(productId);
    if (!product) {
      console.error("Product not found with ID:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate category ID if provided
    if (productData.category) {
      if (!mongoose.Types.ObjectId.isValid(productData.category)) {
        console.error("Invalid category ID:", productData.category);
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }
      const category = await Category.findById(productData.category);
      if (!category) {
        console.error("Category not found:", productData.category);
        return res.status(400).json({
          success: false,
          message: "Invalid category. Please select a valid category.",
        });
      }
    }

    // Handle images
    const images = [];
    const existingImages = Array.isArray(productData.existingImages)
      ? productData.existingImages
      : Object.values(productData.existingImages || {});
    const removedImages = productData.removedImages
      ? productData.removedImages.split(",").filter((img) => img.trim())
      : [];

    console.log("Existing images from form:", existingImages);
    console.log("Removed images:", removedImages);

    // Keep existing images that are not removed
    for (let i = 0; i < existingImages.length; i++) {
      if (existingImages[i] && !removedImages.includes(existingImages[i])) {
        images.push(existingImages[i]);
        console.log(`Keeping existing image ${i}: ${existingImages[i]}`);
      }
    }

    // Delete removed images from Cloudinary
    for (const imgToRemove of removedImages) {
      if (!imgToRemove || imgToRemove.trim() === "") continue;
      try {
        // Extract public ID from Cloudinary URL
        const publicId = imgToRemove.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`product-images/${publicId}`);
        console.log("Deleted image from Cloudinary:", imgToRemove);
      } catch (err) {
        console.error("Error deleting image from Cloudinary:", err);
      }
    }

    // Upload new images to Cloudinary
    if (req.files && req.files.length > 0) {
      console.log("Processing new images:", req.files.length);
      for (const file of req.files) {
        const uploaded = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "product-images",
              transformation: [
                { width: 440, height: 440, crop: "fill" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        images.push(uploaded.secure_url);
        console.log("Uploaded new image to Cloudinary:", uploaded.secure_url);
      }
    }

    // Validate images
    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
      });
    }

    // Parse and process variants
    let rawVariants = productData.variants;
    if (typeof rawVariants === "string") {
      try {
        rawVariants = JSON.parse(rawVariants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid variants format",
        });
      }
    }

    const variants = [];
    if (rawVariants && Array.isArray(rawVariants)) {
      rawVariants.forEach((variant, index) => {
        const { size, regularPrice, salePrice, quantity, sku } = variant;

        if (!size || !regularPrice || !quantity || !sku) {
          throw new Error(`Missing required fields in variant ${index + 1}`);
        }

        const regularPriceNum = parseFloat(regularPrice);
        const salePriceNum = salePrice ? parseFloat(salePrice) : 0;
        const quantityNum = parseInt(quantity);

        if (isNaN(regularPriceNum) || regularPriceNum <= 0) {
          throw new Error(`Invalid regular price in variant ${index + 1}`);
        }
        if (salePrice && (isNaN(salePriceNum) || salePriceNum < 0)) {
          throw new Error(`Invalid sale price in variant ${index + 1}`);
        }
        if (isNaN(quantityNum) || quantityNum < 0) {
          throw new Error(`Invalid quantity in variant ${index + 1}`);
        }
        if (salePriceNum > 0 && salePriceNum >= regularPriceNum) {
          throw new Error(
            `Sale price must be less than regular price in variant ${index + 1}`
          );
        }

        variants.push({
          size,
          regularPrice: regularPriceNum,
          salePrice: salePriceNum,
          quantity: quantityNum,
          sku,
        });
      });
    }

    if (variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product variant is required",
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

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    // Update product using PATCH semantics
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedProduct) {
      console.log("Product updated successfully:", updatedProduct._id);
      return res.status(200).json({
        success: true,
        message: "Product updated successfully",
      });
    } else {
      console.error("Failed to update product");
      return res.status(400).json({
        success: false,
        message: "Failed to update product",
      });
    }
  } catch (error) {
    console.error("Error updating product:", error);
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

