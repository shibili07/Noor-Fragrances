const { EventEmitterAsyncResource } = require("nodemailer/lib/xoauth2");
const Category = require("../../models/categorySchema");



const categoryInfo = async (req,res)=>{
    try {
        //search implement 
        let search =""
        if(req.query.search){
            search = req.query.search
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 4
        const skip = (page-1)*limit
        const categoryData = await Category.find({
            isDeleted:false,
            name:{$regex:".*"+search+".*",$options:"i"}
        })
        .sort({createdAt:1})
        .skip(skip)
        .limit(limit)
        const totalCategories = await Category.find({
            isDeleted:false,
            name:{$regex:".*"+search+".*",$options:"i"}

        }).countDocuments()
        const totalPages = Math.ceil(totalCategories/limit)


        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories : totalCategories 

        });

    } catch (error) {
        console.log(error);
        res.redirect("/pageError")
        
    }
}

const loadAddCategoryPage = (req,res)=>{
    try{
         return  res.render("add-category")
    }catch(error){
        console.log(error);
        res.redirect("/pageError")

    }

}


const addCategory = async(req,res)=>{
    const {name,description} = req.body
    try {
        const existingCategory = await Category.findOne({name})
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description
        })
        await newCategory.save();
        return res.json({message:"Category added successfully "})
    } catch (error) {
        return res.status(500).json({error:"Internal Server Error"})
        
    }
}

const deleteCategory = async (req,res)=>{
    try {
        const {id}=req.body
        await Category.updateOne(
            {_id:id},
            {$set:{isDeleted:true}}
        )
        res.redirect("/admin/category")
    } catch (error) {
        res.redirect("/pageError")
        
    }
}

const loadEditCategoryPage = async(req,res)=>{
    try{
       const {id}= req.query
       
       const categoryData = await Category.findOne({_id:id})
       res.render("edit-category",{cateData:categoryData})
       
    }catch(error){
        res.redirect("/pageError")

    }
}
const editCategory = async (req, res) => {
    try {
        const {id,name,description} = req.body
        const category = await Category.findOneAndUpdate(
            { _id: id },
            { $set: { name: name,description:description}},
            { new: true } // for return new document 
        );
        if(category){
            return res.json({ message: "Category updated successfully" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const listCategory = async(req,res)=>{
    try{
        const {id} = req.query
    await Category.updateOne(
        {_id:id},
        {$set:{isListed:true}}
    )
    res.redirect("/admin/category")

    }catch(error){
        res.redirect("/pageError")
    }
    
}
const unlistCategory = async(req,res)=>{
    try{
        const {id} = req.query
    await Category.updateOne(
        {_id:id},
        {$set:{isListed:false}}
    )
    res.redirect("/admin/category")

    }catch(error){
        res.redirect("/pageError")
    }
    
}


module.exports = {
    categoryInfo,
    loadAddCategoryPage,
    addCategory,
    deleteCategory,
    loadEditCategoryPage,
    editCategory,
    listCategory,
    unlistCategory
}