const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth} = require("../middlewares/auth")
const { uploadMemory } = require("../helpers/multer");
const multer = require("multer")
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})

const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")
const orderController = require("../controllers/admin/orderController")
const couponController = require("../controllers/admin/couponController")
const offerController = require("../controllers/admin/offerController")


//<<error managment>>
router.get("/pageError",adminController.pageError)

//<<login managment>> 
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)

router.get("/logout",adminController.logout)

//<< users managment>> 
router.get("/users",adminAuth,customerController.customerInfo)
//block  and  unblock user
router.patch("/blockCustomer/:id",adminAuth,customerController.blockCustomer)
router.patch("/unblockCustomer/:id",adminAuth,customerController.unblockCustomer)
router.get("/walletDetails/:id",adminAuth,customerController.walletDetails)
router.get("/transactionDetails/:id",adminAuth,customerController.transactionDetails)


//<<category Managment>>
router.get("/category",adminAuth,categoryController.categoryInfo)
router.get("/addCategory",adminAuth,categoryController.loadAddCategoryPage)
router.post("/addCategory",adminAuth,categoryController.addCategory);
//delete category
router.post("/deleteCategory",adminAuth,categoryController.deleteCategory)
//edit category
router.get("/editCategory",adminAuth,categoryController.loadEditCategoryPage)
//upadet that
router.post("/editCategory",adminAuth,categoryController.editCategory)
//list and unlist category
router.patch("/listCategory/:id",adminAuth,categoryController.listCategory)
router.patch("/unlistCategory/:id",adminAuth,categoryController.unlistCategory)

//<<product Management>>
router.get("/product",adminAuth,productController.productInfo)

router.get("/addProduct",adminAuth,productController.addProductPage)
// router.post("/migrate-images", adminAuth,productController.triggerImageMigration);
router.post("/addproduct",adminAuth,uploadMemory.array("images"),productController.addProducts);
// image upload into claudnary 

 
router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/deleteProduct",adminAuth,productController.deleteProduct)

router.get("/editProduct",adminAuth,productController.editProductPage)
router.patch('/editProduct', adminAuth, uploadMemory.array('images', 5), productController.editProduct);

//<<order Management>>

router.get("/orders",adminAuth,orderController.loadOrders)
router.get("/viewOrder",adminAuth,orderController.viewOrder)

router.post("/updateStatus",adminAuth,orderController.updateStatus);
router.post('/return-accept',adminAuth,orderController.handleAcceptReturn);
router.post("/return-reject",adminAuth,orderController.handleRejectReturn)

//coupon Management

router.get("/coupons",adminAuth,couponController.getCouponsPage)
router.get("/addCoupon",adminAuth,couponController.getAddCouponPage)
router.post("/addCoupon",adminAuth,couponController.addCoupon)
router.patch("/listOrUnlist/:id",adminAuth,couponController.listOrUnlist)
router.get("/editCoupon",adminAuth,couponController.getEditCoupon)
router.patch("/editCoupon/:id",adminAuth,couponController.editCoupon)
router.patch("/deleteCoupon",adminAuth,couponController.deleteCoupon)
//offer Management 

router.get("/offers",adminAuth,offerController.getOfferPage)
router.get("/addOffer",adminAuth,offerController.getAddOffer)
router.post("/addOffer",adminAuth,offerController.addOffer)
router.patch('/listOffer',adminAuth, offerController.listOffer);
router.patch('/unlistOffer',adminAuth, offerController.unlistOffer);
router.delete('/deleteOffer',adminAuth, offerController.deleteOffer);
router.get("/editOffer",adminAuth,offerController.getEditOffer)
router.patch('/editOffer/:id',adminAuth,offerController.editOffer)


//sales Report 

router.get("/salesReport",adminAuth,adminController.salesReport)
router.get("/salesReport/pdf",adminAuth,adminController.exportToPDF)
router.get("/salesReport/excel",adminAuth,adminController.exportToExcel)


//dashboard

router.get("/",adminAuth,adminController.loadDashboard)


module.exports = router 