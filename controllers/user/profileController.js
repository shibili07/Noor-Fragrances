const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Cart = require("../../models/cartSchema");
const nodemailer = require("nodemailer");
const bcrypt = require('bcrypt')
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const jwt = require('jsonwebtoken');
const sendEmail = require('../../utils/sendEmail');
const cloudinary = require("../../config/cloudinary")
const Offer= require("../../models/offerSchema");
const Wallet = require('../../models/walletSchema'); // Adjust path as needed



const userInfo = async (req, res) => {
  try {
    const user = req.session.user;
   
    if (user) {
      const userData = await User.findById(user)
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


const loadEditProfile = async (req,res)=>{
  try{
    const user = req.session.user
 
    
  const userData = await User.findById(user)
  
  return res.render("edit-profile",{
    user:userData,
    
  })

  }catch(error){
    console.log("profile rendaring error",error);
    
  }
  

}

const editProfile = async (req, res) => {
  try {
    const userId = req.session.user
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


    const updatedFields = {};

    if (name) updatedFields.name = name;
    if (phone) updatedFields.phone = phone;

    // Handle profile picture upload if file is provided
    if (req.file) {
      // Delete existing Cloudinary image if it exists
      if (user.userImage) {
        try {
          // Extract public ID from Cloudinary URL
          const publicId = user.userImage.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`profile-pictures/${publicId}`);
          console.log("Deleted old profile picture from Cloudinary:", user.userImage);
        } catch (err) {
          console.error("deleting old profile picture from Cloudinary");
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

      updatedFields.userImage = uploaded.secure_url;
      console.log("Uploaded new profile picture to Cloudinary:", uploaded.secure_url);
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



const editPassword = async(req,res)=>{
  try{
    const userId = req.session.user
    const user = await User.findById(userId)
    const {currentPassword,newPassword,confirmPassword}=req.body
    const isMatch = await bcrypt.compare(currentPassword,user.password)

    if(!isMatch){
      return res.status(401).json({success:false,message:"current password is incorrect."})
    }

    if(newPassword !== confirmPassword){
      return res.status(401).json({success:false,message:"confirm password do not match."})
    }
    
    const hashedPassword = await bcrypt.hash(newPassword,10)

    const updatePassword = await User.findByIdAndUpdate(userId,{$set:{password:hashedPassword}}) 
    
    if(updatePassword){
      return res.status(200).json({success:true,message:"Password Updated Successfully"})
    }

  }catch(error){
    console.log("edit password error",error);
    
  }
 
  
}


function generateOtp(){
    return Math.floor(100000+Math.random()*900000).toString();
}


async function sendVerificationEmail(email,otp) {
    try {
        // define transport 
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD

            }
        })
        
        //define info 
        
        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`your OTP  is ${otp}`,
            html:`<b> Your OTP:${otp}</b>`,
        })

        return info.accepted.length>0

    } catch (error) {
        console.error("Error sending email",error)
        return false;
        
    }
    
}








const loadAddressPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const addressDoc = await Address.findOne({ userId });

    const user = await User.findById(userId);

    const addresses = addressDoc ? addressDoc.address : [];

    return res.render('address', { user, addresses });
  } catch (error) {
    console.log(error);
    res.status(500).send('Something went wrong');
  }
};


const getAddaddress = async (req,res)=>{
  try{
    const userId = req.session.user
    const userData = await User.findById(userId)
    
    
    return res.render("addAddress",{user:userData})
  }catch(error){
    console.log(error);
    
  }
}

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
      isDefault
    } = req.body;

    const user = await User.findById(userId);
    let addressDoc = await Address.findOne({ userId });

    if (!addressDoc) {
      addressDoc = new Address({
        userId,
        address: [{
          addressType,
          name,
          phone,
          altPhone,
          city,
          state,
          landMark,
          pincode,
          isDefault: true // First address is default by default
        }],
      });
    } else {
      // Unset existing defaults if the new one is marked default
      if (isDefault===true) {
        addressDoc.address.forEach(addr => (addr.isDefault = false));
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
        isDefault 
      };

      addressDoc.address.push(newAddress);
    }

    await addressDoc.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: addressDoc.address
    });

  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};




const setDefault = async (req, res) => {
  try {
    const { id } = req.query; // address ID to be set as default
    const userId = req.session.user;

    const addressDoc = await Address.findOne({ userId });

    addressDoc.address.forEach(addr => {
      if (addr._id.toString() === id) {
        addr.isDefault = true;
        found = true;
      } else {
        addr.isDefault = false;
      }
    });

    const setDefault = await addressDoc.save();
    if(setDefault){
      return res.status(201).json({success:true,message:"default address added"})
    }
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};



const loadEditAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.session.user;
    const addressDoc = await Address.findOne({ userId });
    const userData = await User.findById(userId);
    const addressToEdit = addressDoc.address.find(adr => adr._id.toString() === addressId);

    if (!addressToEdit) {
      return res.status(404).send("Address not found.");
    }
    res.render("edit-address", { address: addressToEdit, addressId, user: userData });

  } catch (err) {
    console.error("Error loading edit address:", err);
    res.status(500).send("Server error");
  }
};



const editAddress = async (req, res) => {
  try {
    const userId = req.session.user
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
      isDefault
    } = req.body;
    
    const updateQuery = {
      "userId": userId,
      "address._id": addressId
    };

  
    let def = isDefault
    if(isDefault===false){
    const address = await Address.findOne({userId:userId})
    if(address && address.address.length <= 1){
         def=true
    }else{
      def=isDefault
    }
    }


    const updateFields = {
      "address.$.addressType": addressType,
      "address.$.name": name,
      "address.$.phone": phone,
      "address.$.altPhone": altPhone,
      "address.$.city": city,
      "address.$.state": state,
      "address.$.landMark": landMark,
      "address.$.pincode": pincode,
      "address.$.isDefault": def
    };
    const updatedUserAddress = await Address.findOneAndUpdate(
      updateQuery,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!updatedUserAddress) {
      return res.status(404).json({ error: "Address not found" });
    }
    res.status(200).json({ success:true ,message: "Address updated successfully"});
  } catch (error) {
    console.error("Edit address error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}



const deleteAddress = async (req,res) =>{
  try{
  const userId  =  req.session.user
  const{id}= req.params


  const updatedDoc = await Address.updateOne(
    { userId },
    { $pull: { address: { _id: id } } }
);
  if(!updatedDoc){
    return res.status(404).json({message:"Address not found or already deleted"})
  }
  return res.status(200).json({message:'Address deleted successfully'})
  }catch(error){
    console.error('Error deleting address:', err);
    return res.status(500).json({ message: 'Server error' });

  }
  
}





const changeEmailForm = async (req,res)=>{
  try{
    const user = req.session.user
    const userData = await User.findById(user)
    if(user){
      return res.render('changeEmail', { message: null, user:userData});
    }
  }catch(error){
    console.log(error);
  
  }
}



const changeEmail = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Please login to change your email address.' 
      });
    }

    const { newEmail, password } = req.body;
    const sanitizedEmail = newEmail.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitizedEmail)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format.' 
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already in use.' 
      });
    }

    if (!user.password && user.googleId) {
      // OAuth user – skip password check
    } else {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: 'Incorrect password.' 
        });
      }
    }

    const token = jwt.sign(
      { userId, newEmail: sanitizedEmail, type: 'email_change' },
      process.env.JWT_SECRET_KEY,
      { expiresIn: '15m' }
    );

    const link = `${process.env.CLIENT_BASE_URL || 'http://localhost:7000'}/confirm-email?token=${token}`;

    try {
      await sendEmail(
        sanitizedEmail,
        'Confirm Email Change',
        `Click <a href="${link}">here</a> to confirm your email change. this link will expire in 15 minutes`
      );

      return res.status(200).json({
        success: true,
        newEmail: sanitizedEmail
      });
      
    } catch (err) {
      console.error('Email sending failed:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send confirmation email. Please try again.' 
      });
    }


  } catch (error) {
    console.error('Internal error in changeEmail:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error. Please try again later.' 
    });
  }
};



const confirmEmailChange = async (req, res) => {
  try {
    const { token } = req.query; 
    if (!token) {
      return res.render("gmailChangedfailed", {
        message: "Missing token. Please try the email change process again."
      });
    }
    
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      return res.render("gmailChangedfailed", {
        message: "Invalid or expired token. Please try the email change process again."
      });
    }
    
    const { userId, newEmail, type } = decodedToken;
    
    // Verify this is an email change token
    if (type !== 'email_change') {
      return res.render("gmailChangedfailed", {
        message: "Invalid token type. Please try the email change process again."
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found with ID:', userId);
      return res.render("gmailChangedfailed", {success:true,
        message: "User not found. Please contact support."
      });
    }

    // Check if email is already in use by another account
    const existingUser = await User.findOne({ 
      email: newEmail, 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.render("gmailChangedfailed", {
        message: "This email is already in use by another account."
      });
    }

    // Update the user's email
    user.email = newEmail;
    await user.save();

    return res.render("gmailChangedSuccess", {
      newEmail: newEmail
    });
    
  } catch (err) {
    console.error('Error in email change confirmation:', err);
    return res.render("gmailChangedfailed", {
      message: "An unexpected error occurred. Please try again or contact support."
    });
  }
};



const emailSentConfirmation = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.redirect('/profile');
    }
    
    return res.render('emailSentConfirmation', {
      newEmail: email
    });
  } catch (error) {
    console.error('Error in email sent confirmation page:', error);
    return res.redirect('/profile');
  }
};




const loadWallet = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findById(user);
    
    if (!userData) {
      return res.status(404).render('error', { 
        message: 'User not found',
        user: null
      });
    }

  
    let wallet = await Wallet.findOne({ userId: user });
    
    // If wallet doesn't exist, create a new one
    if (!wallet) {
      wallet = new Wallet({
        userId: user,
        balance: 0,
        transactions: []
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
      endItem: Math.min(skip + limit, totalTransactions)
    });
  } catch (error) {
    console.error("Error in wallet page:", error);
    return res.status(500).render('error', { 
      message: 'An error occurred while loading the wallet',
      user: null
    });
  }
};




module.exports = {
  userInfo,
  loadEditProfile,
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
  emailSentConfirmation

  
};

