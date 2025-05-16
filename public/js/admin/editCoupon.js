
    document.addEventListener("DOMContentLoaded", function () {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Initialize Flatpickr for startDate
      flatpickr("#startDate", {
        dateFormat: "d/m/Y",
        minDate: "today",
        defaultDate: "<%= coupon.startDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('/') %>",
      });

      // Initialize Flatpickr for endDate
      flatpickr("#endDate", {
        dateFormat: "d/m/Y",
        minDate: tomorrow,
        defaultDate: "<%= coupon.endDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('/') %>",
      });
    });

    function handleFormSubmit(event) {
      event.preventDefault();
      if (!validateForm(true)) {
        return false;
      }

      const couponId = document.getElementById("couponId").value;
      const couponName = document.getElementById("name").value.trim();
      const couponCode = document.getElementById("code").value.trim().toUpperCase();
      const description = document.getElementById("description").value.trim();
      const startDate = document.getElementById("startDate").value;
      const endDate = document.getElementById("endDate").value;
      const offerPrice = parseFloat(document.getElementById("offerPrice").value);
      const minimumPrice = parseFloat(document.getElementById("minimumPrice").value);

      // Convert Flatpickr format (dd/mm/yyyy) to ISO format (yyyy-mm-dd)
      const parseDate = (dateStr) => {
        const [day, month, year] = dateStr.split("/");
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      };

      fetch(`/admin/editCoupon/${couponId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponName,
          couponCode,
          description,
          startDate: parseDate(startDate),
          endDate: parseDate(endDate),
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
            text: error.message || "An error occurred while updating the coupon",
          });
        });

      return false;
    }

    function validateForm(isEditMode = false) {
      clearErrorMessages();

      // Get and sanitize inputs
      const name = sanitizeInput(document.getElementById("name")?.value?.trim() || "");
      const code = sanitizeInput(document.getElementById("code")?.value?.trim() || "");
      const description = sanitizeInput(document.getElementById("description")?.value?.trim() || "");
      const startDate = document.getElementById("startDate")?.value || "";
      const endDate = document.getElementById("endDate")?.value || "";
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
          errors.push({ id: "name-error", message: "Coupon name must be 3-50 characters long" });
          isValid = false;
        } else if (!/^[a-zA-Z\s]+$/.test(name)) {
          errors.push({ id: "name-error", message: "Coupon name can only contain letters and spaces" });
          isValid = false;
        }

        // Validate code
        if (!code) {
          errors.push({ id: "code-error", message: "Coupon code is required" });
          isValid = false;
        } else if (!/^[A-Z0-9]{5,12}$/.test(code)) {
          errors.push({ id: "code-error", message: "Coupon code must be 5-12 uppercase letters or numbers" });
          isValid = false;
        }

        // Validate description
        if (!description) {
          errors.push({ id: "description-error", message: "Description is required" });
          isValid = false;
        } else if (description.length < 10 || description.length > 500) {
          errors.push({ id: "description-error", message: "Description must be 10-500 characters long" });
          isValid = false;
        }

        // Validate start date
        if (!startDate) {
          errors.push({ id: "startDate-error", message: "Start date is required" });
          isValid = false;
        } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(startDate)) {
          errors.push({ id: "startDate-error", message: "Invalid start date format (DD/MM/YYYY)" });
          isValid = false;
        } else {
          const [day, month, year] = startDate.split("/").map(Number);
          const start = new Date(year, month - 1, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (isNaN(start.getTime()) || start < today) {
            errors.push({ id: "startDate-error", message: "Start date cannot be in the past" });
            isValid = false;
          }
        }

        // Validate end date
        if (!endDate) {
          errors.push({ id: "endDate-error", message: "End date is required" });
          isValid = false;
        } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(endDate)) {
          errors.push({ id: "endDate-error", message: "Invalid end date format (DD/MM/YYYY)" });
          isValid = false;
        } else if (startDate) {
          const [sDay, sMonth, sYear] = startDate.split("/").map(Number);
          const [eDay, eMonth, eYear] = endDate.split("/").map(Number);
          const start = new Date(sYear, sMonth - 1, sDay);
          const end = new Date(eYear, eMonth - 1, eDay);
          if (isNaN(end.getTime())) {
            errors.push({ id: "endDate-error", message: "Invalid end date" });
            isValid = false;
          } else if (end <= start) {
            errors.push({ id: "endDate-error", message: "End date must be after start date" });
            isValid = false;
          } else {
            const oneYearLater = new Date(start);
            oneYearLater.setFullYear(start.getFullYear() + 1);
            if (end > oneYearLater) {
              errors.push({ id: "endDate-error", message: "End date cannot be more than 1 year from start date" });
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
          errors.push({ id: "offerPrice-error", message: "Offer price must be a positive number" });
          isValid = false;
        } else if (offerPriceNum > 10000) {
          errors.push({ id: "offerPrice-error", message: "Offer price cannot exceed 10000" });
          isValid = false;
        }

        // Validate minimum price
        const minimumPriceNum = parseFloat(minimumPrice);
        if (!minimumPrice) {
          errors.push({ id: "minimumPrice-error", message: "Minimum purchase amount is required" });
          isValid = false;
        } else if (isNaN(minimumPriceNum) || minimumPriceNum <= 0) {
          errors.push({ id: "minimumPrice-error", message: "Minimum purchase amount must be a positive number" });
          isValid = false;
        } else if (minimumPriceNum > 100000) {
          errors.push({ id: "minimumPrice-error", message: "Minimum purchase amount cannot exceed 100000" });
          isValid = false;
        }

        // Cross-field validations
        if (!isNaN(offerPriceNum) && !isNaN(minimumPriceNum)) {
          if (offerPriceNum >= minimumPriceNum) {
            errors.push({ id: "offerPrice-error", message: "Offer price must be less than minimum purchase amount" });
            isValid = false;
          }
          const maxOfferPrice = minimumPriceNum * 0.3;
          if (offerPriceNum > maxOfferPrice) {
            errors.push({
              id: "offerPrice-error",
              message: `Offer price cannot exceed 30% of minimum purchase amount (${maxOfferPrice.toFixed(2)})`,
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
