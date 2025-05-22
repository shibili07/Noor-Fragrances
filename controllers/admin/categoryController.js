const { EventEmitterAsyncResource } = require("nodemailer/lib/xoauth2");
const Category = require("../../models/categorySchema");

const categoryInfo = async (req, res) => {
  try {
    //search implement
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const categoryData = await Category.find({
      isDeleted: false,
      name: { $regex: ".*" + search + ".*", $options: "i" },
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
    const totalCategories = await Category.find({
      isDeleted: false,
      name: { $regex: ".*" + search + ".*", $options: "i" },
    }).countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.log(error);
     res.redirect('/admin/pageError');
  }
};

const loadAddCategoryPage = (req, res) => {
  try {
    return res.render("add-category");
  } catch (error) {
    console.log(error);
    res.redirect('/admin/pageError');
  }
};

const addCategory = async (req, res) => {
  let { name, description } = req.body;

  // Sanitize inputs
  name = name?.trim();
  description = description?.trim();

  // Validation
  if (!name) {
    return res
      .status(400)
      .json({ success: false, message: "Name is required" });
  }
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Name must contain only letters and spaces",
      });
  }
  if (name.length < 2 || name.length > 50) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Name must be between 2 and 50 characters",
      });
  }

  if (!description) {
    return res
      .status(400)
      .json({ success: false, message: "Description is required" });
  }
  if (description.length < 10 || description.length > 300) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Description must be between 10 and 300 characters",
      });
  }
  // Reject if name contains repeated characters like "AAAAA"
if (/^([a-zA-Z])\1{2,}$/.test(name)) {
    return res.status(400).json({
      success: false,
      message: "Name cannot contain repeated characters like 'AAAAA'.",
    });
  }
  

  try {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res
      .status(201)
      .json({ success: true, message: "Category added successfully", name });
  } catch (error) {
    console.error("Add Category Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};


const deleteCategory = async (req, res) => {
  try {
    const { id } = req.body;
    await Category.updateOne({ _id: id }, { $set: { isDeleted: true } });
    res.redirect("/admin/category");
  } catch (error) {
     res.redirect('/admin/pageError');
  }
};

const loadEditCategoryPage = async (req, res) => {
  try {
    const { id } = req.query;

    const categoryData = await Category.findOne({ _id: id });
    res.render("edit-category", { cateData: categoryData });
  } catch (error) {
    res.redirect('/admin/pageError');
  }
};

const editCategory = async (req, res) => {
    let { id, name, description } = req.body;
  
    // Sanitize inputs
    name = name?.trim();
    description = description?.trim();
  
    // Validation
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Category ID is required" });
    }
  
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name must contain only letters and spaces",
        });
    }
    if (name.length < 2 || name.length > 50) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name must be between 2 and 50 characters",
        });
    }
    if (/^([a-zA-Z])\1{2,}$/.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Name cannot contain repeated characters like 'AAAAA'",
      });
    }
  
    if (!description) {
      return res
        .status(400)
        .json({ success: false, message: "Description is required" });
    }
    if (description.length < 10 || description.length > 300) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Description must be between 10 and 300 characters",
        });
    }
    
    try {
      // Fetch the current category to compare the name
      const currentCategory = await Category.findById(id);
      if (!currentCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
  
      // Check if the name has changed (case-insensitive)
      const isNameUnchanged = currentCategory.name.toLowerCase() === name.toLowerCase();
  
      // Perform duplicate check only if the name has changed
      if (!isNameUnchanged) {
        const existingCategory = await Category.findOne({
          name: { $regex: new RegExp(`^${name}$`, "i") },
          _id: { $ne: id },
        });
  
        if (existingCategory) {
          return res
            .status(400)
            .json({ success: false, message: "Category already exists" });
        }
      }
  
      // Update category
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: id },
        { $set: { name, description } },
        { new: true }
      );
  
      if (!updatedCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
  
      return res
        .status(200)
        .json({ success: true, message: "Category updated successfully" });
    } catch (error) {
      console.error("Edit Category Error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  };
  

const listCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Category Not Found!" });
    }
    const listCat = await Category.findByIdAndUpdate(
      id,
      { isListed: true },
      { new: true }
    );
    if (listCat) {
      return res
        .status(200)
        .json({ success: true, message: "Category Listed Successfully" });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Error Occurred While Listing category",
        });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const unlistCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Category Not Found!" });
    }
    const unlistCat = await Category.findByIdAndUpdate(
      id,
      { isListed: false },
      { new: true }
    );
    if (unlistCat) {
      return res
        .status(200)
        .json({ success: true, message: "Category Listed Successfully" });
    } else {
      return res
        .status(400)
        .json({
          success: false,
          message: "Error Occurred While Listing category",
        });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  categoryInfo,
  loadAddCategoryPage,
  addCategory,
  deleteCategory,
  loadEditCategoryPage,
  editCategory,
  listCategory,
  unlistCategory,
};
