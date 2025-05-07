const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    userImage: {
        type: [String],
        required: false
    },

    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: 'N/A'
    },

    gender: {
        type: String,
        required: false
    },

    googleId: {
        type: String,
        unique: true,
        required: false,
        sparse: true
    },

    password: {
        type: String,
        required: false,
        default: null
    },

    isBlocked: {
        type: Boolean,
        default: false
    },

    isAdmin: {
        type: Boolean,
        default: false
    },

    cart: [{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],

    wallet: [{
        type: Number,
        default: 0
    }],

    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: "wishlist"
    }],

    OrderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],

    referralCode: {
        type: String,
        unique: true,
        sparse: true 
    },

    redeemed: {
        type: Boolean,
        default: false
    },

    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "user"
    }]
}, {
    timestamps: true
});


userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        let code;
        let isUnique = false;
        while (!isUnique) {
            code = generateReferralCode();
            const existing = await mongoose.models.User.findOne({ referralCode: code });
            if (!existing) isUnique = true;
        }
        this.referralCode = code;
    }
    next();
});



const User = mongoose.model('User', userSchema);
module.exports = User;



// Referral Code Generator Function
function generateReferralCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    let codeLetters = '';
    let codeDigits = '';

    for (let i = 0; i < 5; i++) {
        codeLetters += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    for (let i = 0; i < 3; i++) {
        codeDigits += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    const combined = (codeLetters + codeDigits).split('');
    for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join('');
}