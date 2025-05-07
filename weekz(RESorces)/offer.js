function getBestOffer(applicableOffers, product) {
    if (!Array.isArray(applicableOffers) || applicableOffers.length === 0) return null;

    let bestOffer = null;
    let maxDiscount = 0;

    for (const offer of applicableOffers) {
        let discount = 0;

        if (offer.discountType === 'flat') {
            discount = offer.discountAmount;
        } else if (offer.discountType === 'percentage') {
            discount = (product.salePrice * offer.discountAmount) / 100;
        }

        // if ((product.salePrice / 4) < discount) {
        //     discount = Math.round(product.salePrice / 4);
        //     return
        // }

        if (discount > maxDiscount) {
            maxDiscount = discount;
            bestOffer = offer;
        }
    }

    return bestOffer;
}




const productDetails = async (req, res) => {

    try {

        const userId = req.session.user;
        const userData = await userModel.findById(userId);
        const productId = req.params.id;

        const unlistedCategories = await categoryModel.find({ isListed: false }).select('_id');
        const unlistedBrands = await brandModel.find({ isListed: false }).select('_id');

        const blockedProduct = await productModel.findOne({
            _id: productId,
            $or: [
                { isDeleted: true },
                { category: { $in: unlistedCategories.map(cat => cat._id) } },
                { brand: { $in: unlistedBrands.map(brand => brand._id) } }
            ],
        }).populate('brand category')

        if (blockedProduct) {
            req.session.userMsg = 'This product is unlisted by the seller.'
            return res.redirect('/shop')
        }

        const product = await productModel.findById(productId).populate('brand')

        const currentDate = new Date();

        const allOffers = await offerModel.find({
            isActive: true,
            validFrom: { $lte: new Date(currentDate.setHours(23, 59, 59, 999)) },
            validUpto: { $gte: new Date(currentDate.setHours(0, 0, 0, 0)) }
        }).populate('applicableTo') || [];


        const offers = allOffers
            .filter(item => {
                const offerId = item.applicableTo?._id?.toString();
                return (
                    offerId === product.category.toString() ||
                    offerId === product.brand._id.toString() ||
                    offerId === product._id.toString()
                );
            })
            .sort((a, b) => b.discountAmount - a.discountAmount);

        const bestOffer = getBestOffer(offers, product)

        const relatedProducts = await productModel.find({
            isDeleted: false,
            stock: { $gt: 0 },
            _id: { $ne: productId },
        }).populate('brand')
            .sort({ createdOn: -1 })
            .skip(0)
            .limit(3);

        res.render("user/product-details", {
            findUser: userData,
            product: product,
            relatedProducts,
            quantity: product.stock,
            offers,
            bestOffer
        })
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.redirect('/pagenotfound');
    }
};