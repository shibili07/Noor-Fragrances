
            async function handleFormSubmit(event) {
                event.preventDefault();

                if (!validateForm()) {
                    return false;
                }

                const name = document.getElementById("name").value.trim();
                const description = document.getElementById("description").value.trim();

                try {
                    const response = await fetch("/admin/addCategory", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            name,
                            description,
                        }),
                    });

                    const result = await response.json(); // Parse JSON response

                    if (!response.ok || !result.success) {
                        // Show backend error message
                        Swal.fire({
                            icon: "error",
                            title: "Error",
                            text: result.message || "Something went wrong",
                        });
                        return;
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Success",
                        text: result.message || "Category added successfully",
                        timer: 1500,
                        showConfirmButton: false,
                    });

                    setTimeout(() => {
                        window.location.href = "/admin/category"; // Replace with your desired page
                    }, 1500);

                    document.getElementById("name").value = "";
                    document.getElementById("description").value = "";
                    clearErrorMessages();
                } catch (error) {
                    Swal.fire({
                        icon: "error",
                        title: "Network Error",
                        text: error.message,
                    });
                }
            }

            function validateForm() {
                clearErrorMessages();
                const name = document.getElementById("name").value.trim();
                const description = document.getElementById("description").value.trim();
                let isValid = true;

                if (name === "") {
                    displayErrorMessage("name-error", "Please enter a name.");
                    isValid = false;
                } else if (!/^[a-zA-Z\s]+$/.test(name)) {
                    displayErrorMessage(
                        "name-error",
                        "Name must contain only letters and spaces."
                    );
                    isValid = false;
                } else if (name.length < 2 || name.length > 50) {
                    displayErrorMessage(
                        "name-error",
                        "Name must be between 2 and 50 characters."
                    );
                    isValid = false;
                }
                if (/^([a-zA-Z])\1{2,}$/.test(name)) {
                    displayErrorMessage("name-error", "Name cannot contain repeated characters like 'AAAAA'.");
                    isValid = false;
                }


                if (description === "") {
                    displayErrorMessage("description-error", "Please enter a description.");
                    isValid = false;
                } else if (description.length < 10 || description.length > 300) {
                    displayErrorMessage(
                        "description-error",
                        "Description must be between 10 and 300 characters."
                    );
                    isValid = false;
                } else if (!/^[a-zA-Z0-9\s.,'"\-()!?]+$/.test(description)) {
                    displayErrorMessage(
                        "description-error",
                        "Description contains invalid characters."
                    );
                    isValid = false;
                }

                return isValid;
            }

            function displayErrorMessage(elementId, message) {
                const errorElement = document.getElementById(elementId);
                errorElement.innerText = message;
                errorElement.style.display = "block";
            }

            function clearErrorMessages() {
                const errorElements = document.getElementsByClassName("error-message");
                Array.from(errorElements).forEach((element) => {
                    element.innerText = "";
                    element.style.display = "none";
                });
            }
        