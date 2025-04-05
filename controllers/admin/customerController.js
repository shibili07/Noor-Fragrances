const User = require("../../models/userSchema")

const customerInfo =  async (req,res)=>{
    try {
        let search = "";
        if(req.query.search){
           search = req.query.search;

        }
        let page = 1;
        if(req.query.page){
            page = Number(req.query.page)
        }
        const limit = 3 
        const userData = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}}, // search for all charectors (start or end)
                {email:{$regex:".*"+search+".*"}}
            ]
        })
        .sort({createdAt:-1})
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();
        const count = await User.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}}, // search for all charectors (start or end)
                {email:{$regex:".*"+search+".*"}}
            ]
        }).countDocuments();
        const totalPages = Math.ceil(count/limit)

        res.render("users",{
            data:userData,
            totalPages:totalPages,
            currentPage:page
        })
    } catch (error) {
        res.redirect("/pageError")
    }
}

const blockCustomer = async (req,res)=>{
    try {
        let {id} =  req.body
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
        
    } catch (error) {
        res.redirect("/pageError")
    }
   
}
const unblockCustomer = async (req,res)=>{
    try {
        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageError")
    }
}


module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
    
}
