const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const jwt = require("jsonwebtoken");
const sendEmail = require("../../utils/sendEmail");
const cloudinary = require("../../config/cloudinary");
const Offer = require("../../models/offerSchema");
const Wallet = require("../../models/walletSchema"); // Adjust path as needed

const userInfo = async (req, res) => {
  try {
    const user = req.session.user;

    if (user) {
      const userData = await User.findById(user);
      return res.render("userInfo", {
        user: userData,
        name: userData.name,
      });
    }
  } catch (error) {
    console.log("error occured userInfo" + error);
    req.redirect("/pageError");
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const user = req.session.user;

    const userData = await User.findById(user);

    return res.render("edit-profile", {
      user: userData,
    });
  } catch (error) {
    console.log("profile rendaring error", error);
  }
};

const deleteProfile = async (req, res) => {
  try {
    const { image } = req.body;
   
    const userId = req.session.user;
    const deleteImage = await User.findByIdAndUpdate(
      userId,
      { $pull: { userImage: image } },
      { new: true }
    );

    if (!deleteImage) {
      return res
        .status(400)
        .json({ success: false, message: "User Does not Exist!" });
    } else {
      return res
        .status(200)
        .json({
          json: true,
          message: "User Profile Picture deleted Successfull!",
        });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ json: false, message: "Internal Server Error!" });
  }
};

const editProfile = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log(userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { name, phone } = req.body;

    // Validation functions
    const validateName = (name) => {
      const nameRegex = /^[A-Za-z\s]{2,50}$/;
      return nameRegex.test(name);
    };

    const validatePhone = (phone) => {
      const phoneRegex = /^[6-9]\d{9}$/;
      return phoneRegex.test(phone);
    };

    const validateImage = (file) => {
      const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
      const maxSize = 5 * 1024 * 1024; // 5MB
      return allowedTypes.includes(file.mimetype) && file.size <= maxSize;
    };

    // Validate inputs
    if (name && !validateName(name.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Name must be 2-50 characters long and contain only letters and spaces",
      });
    }

    if (phone && !validatePhone(phone.trim())) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number must be a valid 10-digit Indian number starting with 6-9",
      });
    }

    // Validate image if provided
    if (req.file) {
      if (!validateImage(req.file)) {
        return res.status(400).json({
          success: false,
          message: "Image must be PNG, JPEG, or WebP and not exceed 5MB",
        });
      }
    }

    const updatedFields = {};

    if (name) updatedFields.name = name.trim();
    if (phone) updatedFields.phone = phone.trim();

    if (req.file) {
      if (user.userImage && user.userImage[0]) {
        try {
          // Extract public ID from Cloudinary URL
          const publicId = user.userImage[0].split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile-pictures/${publicId}`);
          console.log(
            "Deleted old profile picture from Cloudinary:",
            user.userImage[0]
          );
        } catch (err) {
          console.error(
            "Error deleting old profile picture from Cloudinary:",
            err
          );
        }
      }

      // Upload new image to Cloudinary
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "profile-pictures",
            transformation: [
              { width: 150, height: 150, crop: "fill" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updatedFields.userImage = [uploaded.secure_url]; // Store as array to match schema
      console.log(
        "Uploaded new profile picture to Cloudinary:",
        uploaded.secure_url
      );
    }

    // Update user only if there are fields to update
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatedFields },
      { new: true, runValidators: true }
    );

    if (updatedUser) {
      res.json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Failed to update profile",
      });
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: `Failed to update profile: ${error.message}`,
    });
  }
};

const editPassword = async (req, res) => {
  try {
    const userId = req.session.user;

    const user = await User.findById(userId);
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect." });
    }

    // Regex: at least 1 lowercase, 1 uppercase, 1 digit, min 8 chars, no special chars
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and include uppercase, lowercase, and a number. No special characters allowed.",
      });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Confirm password does not match new password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword },
    });

    return res
      .status(200)
      .json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Edit password error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    // define transport

    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    //define info

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `your OTP  is ${otp}`,
      html: `<b> Your OTP:${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}

const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressDoc = await Address.findOne({ userId });

    const user = await User.findById(userId);

    const addresses = addressDoc ? addressDoc.address : [];

    return res.render("address", { user, addresses });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
};

const getAddaddress = async (req, res) => {
  try {
    const {checkoutFlag} = req.query
    console.log(checkoutFlag);
    
    const userId = req.session.user;
    const userData = await User.findById(userId);
    if(checkoutFlag){
      return res.render("addAddress", { user: userData ,flag:checkoutFlag});
    }else{
       return res.render("addAddress", { user: userData ,flag:false});

    }
   
  } catch (error) {
    console.log(error);
  }
};

const AddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      addressType,
      name,
      phone,
      altPhone,
      city,
      state,
      landMark,
      pincode,
      isDefault,
     
    } = req.body;

    // Utility: Count unique digits
    const countUniqueDigits = (value) => new Set(value.split("")).size;

    // Validation rules
    const validationRules = {
      name: {
        pattern: /^[A-Za-z\s]{2,50}$/,
        additionalCheck: (value) => !/(\s{2,})/.test(value),
        message: "Invalid name: 2-50 letters and single spaces only",
      },
      phone: {
        pattern: /^[6-9]\d{9}$/,
        additionalCheck: (value) => countUniqueDigits(value) >= 3,
        message:
          "Invalid phone: 10 digits starting with 6-9, min 3 unique digits",
      },
      altPhone: {
        pattern: /^[6-9]\d{9}$/,
        additionalCheck: (value) =>
          countUniqueDigits(value) >= 3 && value !== phone,
        message: "Invalid alt phone: must differ from phone, meet phone rules",
      },
      city: {
        pattern: /^[A-Za-z]{2,50}$/,
        additionalCheck: () => true,
        message: "Invalid city: 2-50 letters only",
      },
      state: {
        pattern: /^[A-Za-z]{2,50}$/,
        additionalCheck: () => true,
        message: "Invalid state: 2-50 letters only",
      },
      landMark: {
        pattern: /^[A-Za-z0-9,\-\s]{6,100}$/,
        additionalCheck: (value) => {
          const uniqueChars = new Set(value.replace(/[\s,\-]/g, "")).size;
          return (
            !/(\s{2,}|,{2,}|-{2,})/.test(value) &&
            /[A-Za-z0-9]/.test(value) &&
            uniqueChars >= 2
          );
        },
        message:
          "Invalid landmark: follow allowed pattern, no consecutive symbols",
      },
      pincode: {
        pattern: /^\d{6}$/,
        additionalCheck: (value) => countUniqueDigits(value) >= 2,
        message: "Invalid pincode: must be 6 digits, at least 2 unique",
      },
    };

    // Apply validation
    const fields = { name, phone, altPhone, city, state, landMark, pincode };
    for (const [key, rule] of Object.entries(validationRules)) {
      const value = fields[key];
      if (!rule.pattern.test(value) || !rule.additionalCheck(value)) {
        return res.status(400).json({ success: false, message: rule.message });
      }
    }

    const user = await User.findById(userId);
    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      // First address, automatically default
      addressDoc = new Address({
        userId,
        address: [
          {
            addressType,
            name,
            phone,
            altPhone,
            city,
            state,
            landMark,
            pincode,
            isDefault: true,
          },
        ],
      });
    } else {
      // Check max limit
      if (addressDoc.address.length >= 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum of 5 addresses allowed",
        });
      }

      // Check for duplicates
      const isDuplicate = addressDoc.address.some(
        (addr) =>
          addr.addressType === addressType &&
          addr.name === name &&
          addr.phone === phone &&
          addr.altPhone === altPhone &&
          addr.city === city &&
          addr.state === state &&
          addr.landMark === landMark &&
          addr.pincode === Number(pincode)
      );

      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: "This address already exists",
        });
      }

      // Handle isDefault flag
      if (isDefault === true) {
        addressDoc.address.forEach((addr) => (addr.isDefault = false));
      }

      const newAddress = {
        addressType,
        name,
        phone,
        altPhone,
        city,
        state,
        landMark,
        pincode,
        isDefault,
      };

      addressDoc.address.push(newAddress);
    }

    await addressDoc.save();
   
    

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: addressDoc.address,
      
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const setDefault = async (req, res) => {
  try {
    const { id } = req.query; // address ID to be set as default
    const userId = req.session.user;

    const addressDoc = await Address.findOne({ userId });

    addressDoc.address.forEach((addr) => {
      if (addr._id.toString() === id) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    const setDefault = await addressDoc.save();
    if (setDefault) {
      return res
        .status(201)
        .json({ success: true, message: "default address added" });
    }
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user;
    const addressDoc = await Address.findOne({ userId });
    const userData = await User.findById(userId);
    const addressToEdit = addressDoc.address.find(
      (adr) => adr._id.toString() === addressId
    );

    if (!addressToEdit) {
      return res.status(404).send("Address not found.");
    }
    res.render("edit-address", {
      address: addressToEdit,
      addressId,
      user: userData,
    });
  } catch (err) {
    console.error("Error loading edit address:", err);
    res.status(500).send("Server error");
  }
};

const editAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const {
      addressId,
      addressType,
      name,
      phone,
      altPhone,
      city,
      state,
      landMark,
      pincode,
      isDefault,
    } = req.body;

    console.log(req.body);

    // Utility to count unique digits
    const countUniqueDigits = (value) => new Set(value.split("")).size;

    // Validation rules (same as in AddAddress)
    const validationRules = {
      name: {
        pattern: /^[A-Za-z\s]{2,50}$/,
        additionalCheck: (value) => !/(\s{2,})/.test(value),
        message: "Invalid name",
      },
      phone: {
        pattern: /^[6-9]\d{9}$/,
        additionalCheck: (value) => countUniqueDigits(value) >= 3,
        message: "Invalid phone",
      },
      altPhone: {
        pattern: /^[6-9]\d{9}$/,
        additionalCheck: (value) =>
          countUniqueDigits(value) >= 3 && value !== phone,
        message: "Invalid alt phone",
      },
      city: {
        pattern: /^[A-Za-z]{2,50}$/,
        additionalCheck: () => true,
        message: "Invalid city",
      },
      state: {
        pattern: /^[A-Za-z]{2,50}$/,
        additionalCheck: () => true,
        message: "Invalid state",
      },
      landMark: {
        pattern: /^[A-Za-z0-9,\-\s]{6,100}$/,
        additionalCheck: (value) => {
          const uniqueChars = new Set(value.replace(/[\s,\-]/g, "")).size;
          return (
            !/(\s{2,}|,{2,}|-{2,})/.test(value) &&
            /[A-Za-z0-9]/.test(value) &&
            uniqueChars >= 2
          );
        },
        message: "Invalid landmark",
      },
      pincode: {
        pattern: /^\d{6}$/,
        additionalCheck: (value) => countUniqueDigits(value) >= 2,
        message: "Invalid pincode",
      },
    };

    // Validate input fields
    const fields = { name, phone, altPhone, city, state, landMark, pincode };
    for (const [key, rule] of Object.entries(validationRules)) {
      const value = fields[key];
      if (!rule.pattern.test(value) || !rule.additionalCheck(value)) {
        return res.status(400).json({ success: false, message: rule.message });
      }
    }

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) {
      return res
        .status(404)
        .json({ success: false, message: "User address record not found" });
    }

    // Check for duplicate (excluding the one being edited)
    const isDuplicate = addressDoc.address.some(
      (addr) =>
        addr._id.toString() !== addressId &&
        addr.addressType === addressType &&
        addr.name === name &&
        addr.phone === phone &&
        addr.altPhone === altPhone &&
        addr.city === city &&
        addr.state === state &&
        addr.landMark === landMark &&
        addr.pincode === Number(pincode)
    );

    if (isDuplicate) {
      return res
        .status(400)
        .json({ success: false, message: "This address already exists" });
    }

    // Force the only address to be default
    let def = isDefault;
    if (isDefault === false && addressDoc.address.length <= 1) {
      def = true;
    }

    // If making this one default, unset others
    if (def === true) {
      addressDoc.address.forEach((addr) => {
        if (addr._id.toString() !== addressId) addr.isDefault = false;
      });
    }

    // Find the target address and update it
    const addressIndex = addressDoc.address.findIndex(
      (addr) => addr._id.toString() === addressId
    );
    if (addressIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    addressDoc.address[addressIndex] = {
      ...addressDoc.address[addressIndex]._doc,
      addressType,
      name,
      phone,
      altPhone,
      city,
      state,
      landMark,
      pincode,
      isDefault: def,
    };

    await addressDoc.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: addressDoc.address,
    });
  } catch (error) {
    console.error("Edit address error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const { id } = req.params;

    const updatedDoc = await Address.updateOne(
      { userId },
      { $pull: { address: { _id: id } } }
    );
    if (!updatedDoc) {
      return res
        .status(404)
        .json({ message: "Address not found or already deleted" });
    }
    return res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const changeEmailForm = async (req, res) => {
  try {
    const user = req.session.user;

    const userData = await User.findById(user);
    if (user) {
      return res.render("changeEmail", { message: null, user: userData });
    }
  } catch (error) {
    console.log(error);
  }
};

const changeEmail = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Please login to change your email address.",
      });
    }

    const { newEmail, password } = req.body;
    console.log(req.body);

    const sanitizedEmail = newEmail.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already in use.",
      });
    }

    if (!user.password && user.googleId) {
      // OAuth user – skip password check
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password.",
        });
      }
    }

    const token = jwt.sign(
      { userId, newEmail: sanitizedEmail, type: "email_change" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "15m" }
    );

    const link = `${
      process.env.CLIENT_BASE_URL || "http://localhost:7000"
    }/confirm-email?token=${token}`;

    try {
      await sendEmail(
        sanitizedEmail,
        "Confirm Email Change",
        `Click <a href="${link}">here</a> to confirm your email change. this link will expire in 15 minutes`
      );

      return res.status(200).json({
        success: true,
        newEmail: sanitizedEmail,
      });
    } catch (err) {
      console.error("Email sending failed:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to send confirmation email. Please try again.",
      });
    }
  } catch (error) {
    console.error("Internal error in changeEmail:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.render("gmailChangedfailed", {
        message: "Missing token. Please try the email change process again.",
      });
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.render("gmailChangedfailed", {
        message:
          "Invalid or expired token. Please try the email change process again.",
      });
    }

    const { userId, newEmail, type } = decodedToken;

    // Verify this is an email change token
    if (type !== "email_change") {
      return res.render("gmailChangedfailed", {
        message:
          "Invalid token type. Please try the email change process again.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found with ID:", userId);
      return res.render("gmailChangedfailed", {
        success: true,
        message: "User not found. Please contact support.",
      });
    }

    // Check if email is already in use by another account
    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: userId },
    });

    if (existingUser) {
      return res.render("gmailChangedfailed", {
        message: "This email is already in use by another account.",
      });
    }

    // Update the user's email
    user.email = newEmail;
    await user.save();

    return res.render("gmailChangedSuccess", {
      newEmail: newEmail,
    });
  } catch (err) {
    console.error("Error in email change confirmation:", err);
    return res.render("gmailChangedfailed", {
      message:
        "An unexpected error occurred. Please try again or contact support.",
    });
  }
};

const emailSentConfirmation = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.redirect("/profile");
    }

    return res.render("emailSentConfirmation", {
      newEmail: email,
    });
  } catch (error) {
    console.error("Error in email sent confirmation page:", error);
    return res.redirect("/profile");
  }
};

const loadWallet = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);

    if (!userData) {
      return res.status(404).render("error", {
        message: "User not found",
        user: null,
      });
    }

    let wallet = await Wallet.findOne({ userId: user });

    // If wallet doesn't exist, create a new one
    if (!wallet) {
      wallet = new Wallet({
        userId: user,
        balance: 0,
        transactions: [],
      });
      await wallet.save();
    }

    // Pagination logic
    const page = parseInt(req.query.page) || 1;
    const limit = 6; // Changed to 6 transactions per page
    const skip = (page - 1) * limit;

    // Get total count of transactions
    const totalTransactions = wallet.transactions.length;
    const totalPages = Math.ceil(totalTransactions / limit);

    // Get paginated transactions (most recent first)
    const paginatedTransactions = wallet.transactions
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit);

    return res.render("wallet", {
      user: userData,
      wallet,
      transactions: paginatedTransactions,
      currentPage: page,
      totalPages,
      totalTransactions,
      isEmpty: totalTransactions === 0,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      startItem: skip + 1,
      endItem: Math.min(skip + limit, totalTransactions),
    });
  } catch (error) {
    console.error("Error in wallet page:", error);
    return res.status(500).render("error", {
      message: "An error occurred while loading the wallet",
      user: null,
    });
  }
};

module.exports = {
  userInfo,
  loadEditProfile,
  deleteProfile,
  editProfile,
  editPassword,
  loadAddressPage,
  getAddaddress,
  AddAddress,
  setDefault,
  loadEditAddress,
  editAddress,
  deleteAddress,
  confirmEmailChange,
  changeEmail,
  changeEmailForm,
  loadWallet,
  emailSentConfirmation,
};
