const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const sharp = require("sharp"); //this module for resize the images
const fs = require("fs");
const path = require("path");



const productInfo = async (req, res) => {
  try {
   let search = req.query.search || "";
   let page = req.query.page||1;
   const limit = 4;

    const searchConditions = [
      { productName: { $regex: new RegExp(search, "i") }},
      { gender: { $regex: new RegExp(search, "i") }},
      { brand: { $regex: new RegExp(search, "i") }}
    ];

    // Find matching category if search term exists
    if (search) {
      const matchingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(search, "i") }
      });
      if (matchingCategory) {
        searchConditions.push({ category: matchingCategory._id });
      }
    }
    const category = await Category.find({isListed:true})
    
    const productData = await Product.find({
      $or: searchConditions
    })
    .populate('category') // Populate category details
    .sort({productName: 1})
    .limit(limit)
    .skip((page-1) * limit)
    .exec();
    
    const count = await Product.countDocuments({
      $or: searchConditions
    });
    const totalPages = Math.ceil(count/limit);
    res.render("product", {
      data: productData,
      totalPages: totalPages,
      currentPage: page,
      cat:category
    });

  } catch (error) {
    console.error("Error in productInfo:", error);
    res.redirect("/pageError");
  }
};





const addProductPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
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
    const productExists = await Product.findOne({
      productName: products.productName,
    });
    if (!productExists) {
      const images = [];
      if (req.files && req.files.length > 0) {
        for (let i = 0; i < req.files.length; i++) {
          const originalPath = req.files[i].path;
          const filename = req.files[i].filename;
          // Create a new filename for the resized image
          const resizedFilename = `resized-${filename}`;
          const resizedPath = path.join(
            path.dirname(originalPath),
            resizedFilename
          );

          // Resize the image to a new file
          await sharp(originalPath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedPath);

          // Delete the original file
          fs.unlinkSync(originalPath);

          // Store the resized filename
          images.push(resizedFilename);
        }
      }
      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid category name" });
      }
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        gender: products.gender,
        category: categoryId._id,
        brand: products.brand,
        productType: products.productType,
        fragranceFamily: products.fragranceFamily,
        usage: products.usage,
        longevity: products.longevity,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdAt: new Date(),
        quantity: products.quantity,
        size: products.sizes || [],
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      if (newProduct) {
        return res.json({
          success: true,
          message: "Product added successfully",
        });
      }
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Product already exists, please try with another name",
        });
    }
  } catch (error) {
    console.error("Error saving product:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const blockProduct = async(req,res)=>{
   try {
      const {id}=req.body
      await Product.findOneAndUpdate(
         {_id:id},
         {$set:{isBlocked:true}}
      )
      res.redirect("/admin/product")
    } catch (error) {
      res.redirect("/pageError")
   }
}

const unblockProduct = async(req,res)=>{
   try{
      const {id}=req.query
   await Product.findOneAndUpdate(
      {_id:id},
      {$set:{isBlocked:false}}
   )
   res.redirect("/admin/product")

   }catch(error){
      res.redirect("/pageError")
   }
   
}

const deleteProduct = async (req,res) =>{
  try{
    const {id}= req.body

    await Product.findOneAndUpdate(
      {_id:id},
      {$set:{isDeleted:true}}
    )
    res.redirect("/admin/product")
  }catch(error){
    res.redirect("/pageError")
  }
 
}

const editProductPage = async(req,res)=>{
   try {
      // Get product ID from query parameter
      const id = req.query.id;
      
      if (!id) {
         console.error("No product ID provided");
         return res.redirect("/pageError");
      }
      
      // Use findById and populate the category
      const product = await Product.findById(id).populate('category');
      const categories = await Category.find({isListed: true});
      
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



const editProduct = async(req, res) => {
  
  try {
    
    const productId = req.body.productId;
    const productData = req.body;
    
  
    const product = await Product.findById(productId);
    if (!product) {
      console.error("Product not found with ID:", productId);
      return res.json({ success: false, message: "Product not found" });
    }
    
    
    console.log("Category from form:", productData.category);
    
    
    const categoryId = await Category.findOne({ name: productData.category });
    if (!categoryId) {
      console.error("Invalid category name:", productData.category);
      
      const validCategories = await Category.find({isListed: true}).select('name');
      console.log("Valid categories:", validCategories.map(c => c.name));
      
      
      if (product.category) {
        console.log("Using existing category");
        productData.category = product.category;
      } else {
        return res.json({ success: false, message: "Invalid category name. Please select a valid category." });
      }
    }
    
  
    const images = [];
    const existingImages = req.body.existingImages || [];
    const removedImages = productData.removedImages ? productData.removedImages.split(',').filter(img => img) : [];
    
    console.log("Existing images from form:", existingImages);
    console.log("Removed images:", removedImages);
    
    // First, keep existing images that weren't removed
    for (let i = 0; i < existingImages.length; i++) {
      if (existingImages[i] && !removedImages.includes(existingImages[i])) {
        images.push(existingImages[i]);
        console.log(`Keeping existing image ${i}: ${existingImages[i]}`);
      }
    }
    
    // Process removed images (delete the files)
    for (const imgToRemove of removedImages) {
      if (!imgToRemove || imgToRemove.trim() === '') continue;
      
      // Delete the image file from storage
      try {
        const imagePath = path.join(__dirname, '../../public/uploads/product-images', imgToRemove);

        console.log("Attempting to delete file:", imagePath);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log("Deleted image file:", imgToRemove);
        } else {
          console.log("File not found for deletion:", imagePath);
        }
      } catch (err) {
        console.error("Error deleting image file:", err);
        console.error(err.stack);
      }
    }
    
  
    if (req.files && req.files.length > 0) {
      console.log("Processing new images:", req.files.length);
      
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const originalPath = file.path;
        
        if (!originalPath || !fs.existsSync(originalPath)) {
          console.error(`Invalid file path or file does not exist: ${originalPath}`);
          continue;
        }
        
       
        const filename = file.filename;
        const resizedFilename = `resized-${filename}`;
        const resizedPath = path.join(path.dirname(originalPath), resizedFilename);
        
        console.log("Processing file:", filename);
        console.log("Original path:", originalPath);
        console.log("Resized path:", resizedPath);
        
        try {
         
          const targetDir = path.dirname(resizedPath);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
        
          await sharp(originalPath)
            .resize({ width: 440, height: 440 })
            .toFile(resizedPath);
          
          
          fs.unlinkSync(originalPath);
          
         
          const fieldname = file.fieldname;
          console.log("Field name:", fieldname);
       
          images.push(resizedFilename);
          console.log("Successfully processed image:", resizedFilename);
        } catch (err) {
          console.error("Error processing image:", err);
          console.error(err.stack);
        }
      }
    } else {
      console.log("No new files uploaded");
    }
    
    // Prepare the update object
    const updateData = {
      productName: productData.productName,
      description: productData.description,
      gender: productData.gender,
      brand: productData.brand,
      productType: productData.productType,
      fragranceFamily: productData.fragranceFamily,
      usage: productData.usage,
      longevity: productData.longevity,
      regularPrice: productData.regularPrice,
      salePrice: productData.salePrice,
      quantity: productData.quantity,
      productImage: images,
      updatedAt: new Date()
    };
    

    if (productData.sizes && Array.isArray(productData.sizes)) {
      updateData.size = productData.sizes; // Store sizes as an array
    } else if (productData.sizes) {
      updateData.size = [productData.sizes]; // Convert to array if it's a single value
    }
    
    console.log("Update data:", updateData);
    
    if (categoryId) {
      updateData.category = categoryId._id;
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true }
    );
    
    if (updatedProduct) {
      console.log("Product updated successfully:", updatedProduct._id);
      return res.json({ success: true, message: "Product updated successfully" });
    } else {
      console.error("Failed to update product");
      return res.json({ success: false, message: "Failed to update product" });
    }
    
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error: " + error.message });
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

