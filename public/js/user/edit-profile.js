

let cropper;

// Validation functions
function validateName(name) {
    const nameRegex = /^[A-Za-z\s]{2,50}$/;
    return nameRegex.test(name);
}

function validatePhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

function validateImage(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    return allowedTypes.includes(file.type);
}

// Handle file selection and initialize cropper
document.getElementById("profilePicture").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
        // Validate image type
        if (!validateImage(file)) {
            Swal.fire({
                icon: "error",
                title: "Invalid File Type",
                text: "Please upload a PNG, JPEG, or WebP image only.",
            });
            this.value = ''; // Clear the input
            return;
        }

        const reader = new FileReader();

        reader.onload = function (e) {
            const imagePreview = document.getElementById("image-cropper-preview");
            imagePreview.src = e.target.result;

            document.getElementById("image-cropper-container").style.display = "block";

            if (cropper) cropper.destroy();

            cropper = new Cropper(imagePreview, {
                aspectRatio: 1,
                viewMode: 1,
                scalable: true,
                zoomable: true,
                rotatable: true,
                cropBoxResizable: true,
                ready: function () {
                    console.log("Cropper initialized.");
                },
            });
        };

        reader.readAsDataURL(file);
    }
});

// Handle cropping and preview update
document.getElementById("cropImageBtn").addEventListener("click", function () {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas({
            width: 150,
            height: 150,
        });

        if (!canvas) {
            alert("Failed to crop image.");
            return;
        }

        const croppedImage = canvas.toDataURL("image/jpeg");
        const profilePicturePreview = document.getElementById("profilePicturePreview");

        // Update the image source
        profilePicturePreview.src = croppedImage;
        profilePicturePreview.style.display = "block";

        // Hide the cropper container
        document.getElementById("image-cropper-container").style.display = "none";

        // Destroy the cropper instance
        cropper.destroy();
        cropper = null;
    }
});

// Convert Data URL to File object
function dataURLToFile(dataURL, filename) {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
}

// Handle form submission
document.getElementById("editProfileForm").onsubmit = async function (e) {
    e.preventDefault();

    // Get form values
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Validate form inputs
    if (!validateName(name)) {
        Swal.fire({
            icon: "error",
            title: "Invalid Name",
            text: "Name should be 2-50 characters long and contain only letters and spaces.",
        });
        return;
    }

    if (!validatePhone(phone)) {
        Swal.fire({
            icon: "error",
            title: "Invalid Phone Number",
            text: "Please enter a valid 10-digit Indian phone number starting with 6-9.",
        });
        return;
    }

    const formData = new FormData(this);
    const profilePicturePreview = document.getElementById("profilePicturePreview");

    // If a new image was cropped, add it to FormData
    if (profilePicturePreview.src.startsWith("data:")) {
        const croppedImageDataURL = profilePicturePreview.src;
        const file = dataURLToFile(croppedImageDataURL, "profile-picture.jpg");
        formData.set("profilePicture", file);
    }

    try {
        const userId = "<%= user._id %>";

        // Show loading popup
        Swal.fire({
            title: "Updating...",
            text: "Please wait while we update your profile.",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        const response = await fetch(`/editProfile?userId=${userId}`, {
            method: "PATCH",
            body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: result.message || "Failed to update profile.",
            });
            return;
        }

        Swal.fire({
            icon: "success",
            title: "Success",
            text: "Profile updated successfully!",
        }).then(() => {
            window.location.href = "/profile";
        });
    } catch (err) {
        console.error("Error:", err);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "An error occurred while updating the profile.",
        });
    }
};

function confirmAndDeleteProfile(imageUrl) {
Swal.fire({
title: 'Are you sure?',
text: 'This will remove your profile picture.',
icon: 'warning',
showCancelButton: true,
confirmButtonColor: '#d33',
cancelButtonColor: '#3085d6',
confirmButtonText: 'Yes, remove it!'
}).then((result) => {
if (result.isConfirmed) {
  fetch('/removeProfile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ image: imageUrl })
  })
  .then(res => res.json())
  .then(data => {
    Swal.fire('Deleted!', data.message || 'Profile picture removed.', 'success')
      .then(() => location.reload());
  })
  .catch(err => {
    console.error(err);
    Swal.fire('Error', 'Failed to remove profile picture.', 'error');
  });
}
});
}
