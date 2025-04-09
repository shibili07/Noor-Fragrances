const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");

const express = require("express");

const loadShopPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    const listedCategories = await Category.find({ isListed: true }).select(
      "_id"
    );

    const search = req.query.search || "";
    const sort = req.query.sort || "";
    const genderf = req.query.genderf;
    const categoryf = req.query.categoryf;
    const size = req.query.size;
    const page = parseInt(req.query.page) || 1;
    const perPage = 6;
    const minValue = req.query.minValue ? parseFloat(req.query.minValue) : 1;
    const maxValue = req.query.maxValue
      ? parseFloat(req.query.maxValue)
      : 10000;

    let filter = {
      isDeleted: false,
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: listedCategories.map((cat) => cat._id) },
      gender: { $in: ["Men", "Women", "Kids", "Unisex"] },
      salePrice: { $gte: minValue, $lte: maxValue },
    };

    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    if (categoryf) {
      filter.category = categoryf;
    }

    if (genderf) {
      filter.gender = genderf;
    }

    if (size) {
      filter.size = size;
    }

    let sortOption = {};
    if (sort === "A-Z") sortOption = { productName: 1 };
    else if (sort === "Z-A") sortOption = { productName: -1 };
    else if (sort === "Price : low - high") sortOption = { salePrice: 1 };
    else if (sort === "Price : high - low") sortOption = { salePrice: -1 };
    else sortOption = { createdAt: -1 };

    const category = await Category.find({ isListed: true, isDeleted: false });

    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / perPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .populate("category");

    res.render("shop", {
      user: userData,

      products,
      totalPages,
      currentPage,
      maxValue,
      minValue,
      search,
      sort,
      categoryf,
      genderf,
      size,
      category,
    });
  } catch (error) {
    console.log("Error loading shop page:", error);
    res.status(500).send("Server error");
  }
};

const productDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.session.user;
    const userData = await User.findById(user);
    const product = await Product.findById(id).populate("category").lean();
    const category = product.category;
    const similerProducts = await Product.find({
      category: category,
      _id: { $ne: product._id },
    })
      .limit(9)
      .lean();
    if (!product) {
      res.redirect("/pageError");
    }
    res.render("product-details", {
      user: userData,
      product: product,
      category: category,
      similer: similerProducts,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/pageError");
  }
};



module.exports = {
  loadShopPage,
  productDetails,
  
};
