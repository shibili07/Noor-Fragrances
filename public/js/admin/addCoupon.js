
  document.addEventListener("DOMContentLoaded", function () {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Initialize Flatpickr for createdAt
    flatpickr("#createdAt", {
      dateFormat: "d/m/Y",
      minDate: "today",
      defaultDate: today,
      onChange: () => validateSingleField("createdAt"), // Validate on date change
    });

    // Initialize Flatpickr for expireOn
    flatpickr("#expireOn", {
      dateFormat: "d/m/Y",
      minDate: tomorrow,
      onChange: () => validateSingleField("expireOn"), // Validate on date change
    });

    // Add event listeners for real-time validation on input fields
    const inputs = [
      "name",
      "code",
      "description",
      "offerPrice",
      "minimumPrice",
      "createdAt",
      "expireOn",
    ];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener("input", () => validateSingleField(id));
        input.addEventListener("change", () => validateSingleField(id)); // For Flatpickr or other inputs
      }
    });
  });

  function handleFormSubmit(event) {
    event.preventDefault();
    if (!validateForm()) {
      return false;
    }

    const name = document.getElementById("name").value.trim();
    const code = document.getElementById("code").value.trim().toUpperCase();
    const description = document.getElementById("description").value.trim();
    const createdAt = document.getElementById("createdAt").value;
    const expireOn = document.getElementById("expireOn").value;
    const offerPrice = parseFloat(document.getElementById("offerPrice").value);
    const minimumPrice = parseFloat(document.getElementById("minimumPrice").value);

    // Convert Flatpickr format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
    const parseDate = (dateStr) => {
      const [day, month, year] = dateStr.split("/");
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    };

    fetch("/admin/addCoupon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        code,
        description,
        createdAt: parseDate(createdAt),
        expireOn: parseDate(expireOn),
        offerPrice,
        minimumPrice,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) {
          throw new Error(data.message);
        }
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: data.message,
          timer: 1500,
        }).then(() => {
          window.location.href = "/admin/coupons";
        });
      })
      .catch((error) => {
        Swal.fire({
          icon: "error",
          title: "Oops",
          text: error.message || "An error occurred while adding the coupon",
        });
      });

    return false;
  }

  function validateForm() {
    clearErrorMessages();

    // Get and sanitize inputs
    const name = sanitizeInput(document.getElementById("name")?.value?.trim() || "");
    const code = sanitizeInput(document.getElementById("code")?.value?.trim() || "");
    const description = sanitizeInput(
      document.getElementById("description")?.value?.trim() || ""
    );
    const createdAt = document.getElementById("createdAt")?.value || "";
    const expireOn = document.getElementById("expireOn")?.value || "";
    const offerPrice = document.getElementById("offerPrice")?.value?.trim() || "";
    const minimumPrice = document.getElementById("minimumPrice")?.value?.trim() || "";

    let isValid = true;
    const errors = [];

    try {
      // Validate name
      if (!name) {
        errors.push({ id: "name-error", message: "Coupon name is required" });
        isValid = false;
      } else if (name.length < 3 || name.length > 50) {
        errors.push({
          id: "name-error",
          message: "Coupon name must be 3-50 characters long",
        });
        isValid = false;
      } else if (!/^[a-zA-Z\s]+$/.test(name)) {
        errors.push({
          id: "name-error",
          message: "Coupon name can only contain letters and spaces",
        });
        isValid = false;
      }

      // Validate code
      if (!code) {
        errors.push({ id: "code-error", message: "Coupon code is required" });
        isValid = false;
      } else if (!/^[A-Z0-9]{5,12}$/.test(code)) {
        errors.push({
          id: "code-error",
          message:
            "Coupon code must be 5-12 uppercase letters or numbers Spaces Not Allowed",
        });
        isValid = false;
      }

      // Validate description
      if (!description) {
        errors.push({ id: "description-error", message: "Description is required" });
        isValid = false;
      } else if (description.length < 10 || description.length > 500) {
        errors.push({
          id: "description-error",
          message: "Description must be 10-500 characters long",
        });
        isValid = false;
      }

      // Validate created date
      if (!createdAt) {
        errors.push({ id: "createdAt-error", message: "Created date is required" });
        isValid = false;
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(createdAt)) {
        errors.push({
          id: "createdAt-error",
          message: "Invalid created date format (DD/MM/YYYY)",
        });
        isValid = false;
      } else {
        const [day, month, year] = createdAt.split("/").map(Number);
        const createdDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(createdDate.getTime()) || createdDate < today) {
          errors.push({
            id: "createdAt-error",
            message: "Created date cannot be in the past",
          });
          isValid = false;
        }
      }

      // Validate expiry date
      if (!expireOn) {
        errors.push({ id: "expireOn-error", message: "Expiry date is required" });
        isValid = false;
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(expireOn)) {
        errors.push({
          id: "expireOn-error",
          message: "Invalid expiry date format (DD/MM/YYYY)",
        });
        isValid = false;
      } else if (createdAt) {
        const [cDay, cMonth, cYear] = createdAt.split("/").map(Number);
        const [eDay, eMonth, eYear] = expireOn.split("/").map(Number);
        const createdDate = new Date(cYear, cMonth - 1, cDay);
        const expireDate = new Date(eYear, eMonth - 1, eDay);
        if (isNaN(expireDate.getTime())) {
          errors.push({ id: "expireOn-error", message: "Invalid expiry date" });
          isValid = false;
        } else if (expireDate <= createdDate) {
          errors.push({
            id: "expireOn-error",
            message: "Expiry date must be after created date",
          });
          isValid = false;
        } else {
          const oneYearLater = new Date(createdDate);
          oneYearLater.setFullYear(createdDate.getFullYear() + 1);
          if (expireDate > oneYearLater) {
            errors.push({
              id: "expireOn-error",
              message: "Expiry date cannot be more than 1 year from created date",
            });
            isValid = false;
          }
        }
      }

      // Validate offer price
      const offerPriceNum = parseFloat(offerPrice);
      if (!offerPrice) {
        errors.push({ id: "offerPrice-error", message: "Offer price is required" });
        isValid = false;
      } else if (isNaN(offerPriceNum) || offerPriceNum <= 0) {
        errors.push({
          id: "offerPrice-error",
          message: "Offer price must be a positive number",
        });
        isValid = false;
      } else if (offerPriceNum > 10000) {
        errors.push({
          id: "offerPrice-error",
          message: "Offer price cannot exceed 10000",
        });
        isValid = false;
      }

      // Validate minimum price
      const minimumPriceNum = parseFloat(minimumPrice);
      if (!minimumPrice) {
        errors.push({
          id: "minimumPrice-error",
          message: "Minimum purchase amount is required",
        });
        isValid = false;
      } else if (isNaN(minimumPriceNum) || minimumPriceNum <= 0) {
        errors.push({
          id: "minimumPrice-error",
          message: "Minimum purchase amount must be a positive number",
        });
        isValid = false;
      } else if (minimumPriceNum > 1000000) {
        errors.push({
          id: "minimumPrice-error",
          message: "Minimum purchase amount cannot exceed 100000",
        });
        isValid = false;
      }

      // Cross-field validations
      if (!isNaN(offerPriceNum) && !isNaN(minimumPriceNum)) {
        if (offerPriceNum >= minimumPriceNum) {
          errors.push({
            id: "offerPrice-error",
            message: "Offer price must be less than minimum purchase amount",
          });
          isValid = false;
        }
        const maxOfferPrice = minimumPriceNum * 0.3;
        if (offerPriceNum > maxOfferPrice) {
          errors.push({
            id: "offerPrice-error",
            message: `Offer price cannot exceed 30% of minimum purchase amount (${maxOfferPrice.toFixed(
              2
            )})`,
          });
          isValid = false;
        }
      }

      // Display all errors
      errors.forEach((error) => displayErrorMessage(error.id, error.message));

      return isValid;
    } catch (error) {
      console.error("Validation error:", error);
      displayErrorMessage("form-error", "An unexpected error occurred. Please try again.");
      return false;
    }
  }

  // New function to validate a single field and clear its error if valid
  function validateSingleField(fieldId) {
    // Clear only the error for this specific field
    clearErrorMessage(fieldId);

    // Get and sanitize input for the field
    const input = sanitizeInput(
      document.getElementById(fieldId)?.value?.trim() || ""
    );
    let isValid = true;
    let error = null;

    try {
      switch (fieldId) {
        case "name":
          if (!input) {
            error = { id: "name-error", message: "Coupon name is required" };
            isValid = false;
          } else if (input.length < 3 || input.length > 50) {
            error = {
              id: "name-error",
              message: "Coupon name must be 3-50 characters long",
            };
            isValid = false;
          } else if (!/^[a-zA-Z\s]+$/.test(input)) {
            error = {
              id: "name-error",
              message: "Coupon name can only contain letters and spaces",
            };
            isValid = false;
          }
          break;

        case "code":
          if (!input) {
            error = { id: "code-error", message: "Coupon code is required" };
            isValid = false;
          } else if (!/^[A-Z0-9]{5,12}$/.test(input)) {
            error = {
              id: "code-error",
              message:
                "Coupon code must be 5-12 uppercase letters or numbers Spaces Not Allowed",
            };
            isValid = false;
          }
          break;

        case "description":
          if (!input) {
            error = { id: "description-error", message: "Description is required" };
            isValid = false;
          } else if (input.length < 10 || input.length > 500) {
            error = {
              id: "description-error",
              message: "Description must be 10-500 characters long",
            };
            isValid = false;
          }
          break;

        case "createdAt":
          if (!input) {
            error = { id: "createdAt-error", message: "Created date is required" };
            isValid = false;
          } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
            error = {
              id: "createdAt-error",
              message: "Invalid created date format (DD/MM/YYYY)",
            };
            isValid = false;
          } else {
            const [day, month, year] = input.split("/").map(Number);
            const createdDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (isNaN(createdDate.getTime()) || createdDate < today) {
              error = {
                id: "createdAt-error",
                message: "Created date cannot be in the past",
              };
              isValid = false;
            }
          }
          break;

        case "expireOn":
          const createdAt = document.getElementById("createdAt")?.value || "";
          if (!input) {
            error = { id: "expireOn-error", message: "Expiry date is required" };
            isValid = false;
          } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
            error = {
              id: "expireOn-error",
              message: "Invalid expiry date format (DD/MM/YYYY)",
            };
            isValid = false;
          } else if (createdAt) {
            const [cDay, cMonth, cYear] = createdAt.split("/").map(Number);
            const [eDay, eMonth, eYear] = input.split("/").map(Number);
            const createdDate = new Date(cYear, cMonth - 1, cDay);
            const expireDate = new Date(eYear, eMonth - 1, eDay);
            if (isNaN(expireDate.getTime())) {
              error = { id: "expireOn-error", message: "Invalid expiry date" };
              isValid = false;
            } else if (expireDate <= createdDate) {
              error = {
                id: "expireOn-error",
                message: "Expiry date must be after created date",
              };
              isValid = false;
            } else {
              const oneYearLater = new Date(createdDate);
              oneYearLater.setFullYear(createdDate.getFullYear() + 1);
              if (expireDate > oneYearLater) {
                error = {
                  id: "expireOn-error",
                  message:
                    "Expiry date cannot be more than 1 year from created date",
                };
                isValid = false;
              }
            }
          }
          break;

        case "offerPrice":
          const offerPriceNum = parseFloat(input);
          if (!input) {
            error = { id: "offerPrice-error", message: "Offer price is required" };
            isValid = false;
          } else if (isNaN(offerPriceNum) || offerPriceNum <= 0) {
            error = {
              id: "offerPrice-error",
              message: "Offer price must be a positive number",
            };
            isValid = false;
          } else if (offerPriceNum > 10000) {
            error = {
              id: "offerPrice-error",
              message: "Offer price cannot exceed 10000",
            };
            isValid = false;
          } else {
            // Cross-field validation with minimumPrice
            const minimumPrice = parseFloat(
              document.getElementById("minimumPrice")?.value?.trim() || "0"
            );
            if (!isNaN(minimumPrice) && minimumPrice > 0) {
              if (offerPriceNum >= minimumPrice) {
                error = {
                  id: "offerPrice-error",
                  message:
                    "Offer price must be less than minimum purchase amount",
                };
                isValid = false;
              }
              const maxOfferPrice = minimumPrice * 0.3;
              if (offerPriceNum > maxOfferPrice) {
                error = {
                  id: "offerPrice-error",
                  message: `Offer price cannot exceed 30% of minimum purchase amount (${maxOfferPrice.toFixed(
                    2
                  )})`,
                };
                isValid = false;
              }
            }
          }
          break;

        case "minimumPrice":
          const minimumPriceNum = parseFloat(input);
          if (!input) {
            error = {
              id: "minimumPrice-error",
              message: "Minimum purchase amount is required",
            };
            isValid = false;
          } else if (isNaN(minimumPriceNum) || minimumPriceNum <= 0) {
            error = {
              id: "minimumPrice-error",
              message: "Minimum purchase amount must be a positive number",
            };
            isValid = false;
          } else if (minimumPriceNum > 1000000) {
            error = {
              id: "minimumPrice-error",
              message: "Minimum purchase amount cannot exceed 100000",
            };
            isValid = false;
          } else {
            // Cross-field validation with offerPrice
            const offerPrice = parseFloat(
              document.getElementById("offerPrice")?.value?.trim() || "0"
            );
            if (!isNaN(offerPrice) && offerPrice > 0) {
              if (offerPrice >= minimumPriceNum) {
                error = {
                  id: "minimumPrice-error",
                  message:
                    "Minimum purchase amount must be greater than offer price",
                };
                isValid = false;
              }
              const maxOfferPrice = minimumPriceNum * 0.3;
              if (offerPrice > maxOfferPrice) {
                error = {
                  id: "minimumPrice-error",
                  message: `Offer price cannot exceed 30% of minimum purchase amount (${maxOfferPrice.toFixed(
                    2
                  )})`,
                };
                isValid = false;
              }
            }
          }
          break;

        default:
          break;
      }

      if (error) {
        displayErrorMessage(error.id, error.message);
      }

      return isValid;
    } catch (error) {
      console.error(`Validation error for ${fieldId}:`, error);
      displayErrorMessage(
        `${fieldId}-error`,
        "An unexpected error occurred. Please try again."
      );
      return false;
    }
  }

  function sanitizeInput(input) {
    if (typeof input !== "string") return "";
    return input.replace(/[<>{}]/g, "").trim();
  }

  function displayErrorMessage(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.innerText = message;
      errorElement.style.display = "block";
    }
  }

  function clearErrorMessages() {
    const errorElements = document.getElementsByClassName("error-message");
    Array.from(errorElements).forEach((element) => {
      element.innerText = "";
      element.style.display = "none";
    });
  }

  // New function to clear error message for a single field
  function clearErrorMessage(fieldId) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
      errorElement.innerText = "";
      errorElement.style.display = "none";
    }
  }
