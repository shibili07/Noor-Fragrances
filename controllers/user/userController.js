
const loadHomepage = async (req,res) =>{
    try {
        
        return res.render("home")
    } catch (error) {
        console.log("home page is not found");
        res.status(500).send("Server error") //pass to backend
        
    }

}



module.exports={
    loadHomepage,
}