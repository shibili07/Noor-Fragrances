const express = require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth} = require("../middlewares/auth")

const multer = require("multer")
const storage = require("../helpers/multer")
const uploads = multer({storage:storage})

const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const productController = require("../controllers/admin/productController")

//<<error managment>>
router.get("/pageError",adminController.pageError)

//<<login managment>> 
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)

//<< users managment>> 
router.get("/users",adminAuth,customerController.customerInfo)
//block  and  unblock user
router.post("/blockCustomer",adminAuth,customerController.blockCustomer)
router.get("/unblockCustomer",adminAuth,customerController.unblockCustomer)


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
router.get("/listCategory",adminAuth,categoryController.listCategory)
router.get("/unlistCategory",adminAuth,categoryController.unlistCategory)

//<<product Management>>
router.get("/product",adminAuth,productController.productInfo)

router.get("/addProduct",productController.addProductPage)
router.post("/addProduct",adminAuth,uploads.array("images",3),productController.addProducts)
router.post("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.post("/deleteProduct",adminAuth,productController.deleteProduct)
router.get("/editProduct",adminAuth,productController.editProductPage)
router.post("/editProduct",adminAuth,uploads.array('images', 3),productController.editProduct)

module.exports = router 