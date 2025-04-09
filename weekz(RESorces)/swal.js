fetch(form.action, {
    method: "POST",
    body: formData
})
.then(response => {
    console.log("Response status:", response.status);
    if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
    }
    return response.json();
})
.then(data => {
    console.log("Response data:", data);
    Swal.fire({
        icon: data.success ? "success" : "error",
        title: data.success ? "Success!" : "Error!",
        text: data.message || "Something went wrong!",
        confirmButtonText: "OK"
    }).then(() => {
        if (data.success) {
            window.location.href = "/admin/product";
        } else {
        
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
            }
        }
    });
})
.catch(error => {
    console.error("Error:", error);
    Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Something went wrong. Please try again.",
        confirmButtonText: "OK"
    });
    
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    }
});

return false; 
