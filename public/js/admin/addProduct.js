
   // Variant Management
    let variantCount = 1;
    const MAX_VARIANTS = 5;

    function addVariant() {
      if (variantCount >= MAX_VARIANTS) {
        Swal.fire({
          icon: 'warning',
          title: 'Maximum Limit Reached',
          text: 'You can add a maximum of 5 variants.',
          confirmButtonText: 'OK'
        });
        return;
      }

      variantCount++;
      const newVariantId = `variant-${variantCount}`;
      const variantIndex = variantCount - 1;

      const variantHTML = `
                <div class="variant-section" id="${newVariantId}">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="form-section-title mb-0">Variant ${variantCount}</h6>
                        <div class="variant-actions">
                            <button type="button" class="btn btn-sm btn-danger" onclick="removeVariant('${newVariantId}')">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" id="add-variant-btn" onclick="addVariant()" style="display: none;">
                                <i class="fas fa-plus"></i> Add Variant
                            </button>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4 mb-4">
                            <label class="form-label required-label">Size</label>
                            <select class="form-select variant-size" name="variants[${variantIndex}][size]">
                                <option value="">Select Size</option>
                                <option value="20">20 ml</option>
                                <option value="50">50 ml</option>
                                <option value="100">100 ml</option>
                                <option value="150">150 ml</option>
                                <option value="200">200 ml</option>
                                <option value="250">250 ml</(initiatives.md)option>
                            </select>
                            <div class="error-message size-error"></div>
                        </div>
                        <div class="col-md-4 mb-4">
                            <label class="form-label required-label">SKU</label>
                            <input type="text" placeholder="SKU identifier" name="variants[${variantIndex}][sku]" class="form-control variant-sku">
                            <div class="error-message sku-error"></div>
                        </div>
                        <div class="col-md-4 mb-4">
                            <label class="form-label required-label">Quantity</label>
                            <input placeholder="Stock quantity" name="variants[${variantIndex}][quantity]" type="number" min="0" class="form-control variant-quantity">
                            <div class="error-message quantity-error"></div>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-4">
                            <label class="form-label required-label">Price</label>
                            <div class="price-input-group">
                                <input placeholder="0.00" name="variants[${variantIndex}][salePrice]" type="number" step="0.01" min="0" class="form-control variant-sale-price">
                            </div>
                            <div class="error-message sale-price-error"></div>
                        </div>
                    </div>
                    <hr class="mb-4">
                </div>
            `;

      document.getElementById('variants-container').insertAdjacentHTML('beforeend', variantHTML);
      updateAddVariantButtonVisibility();
      updateSizeOptions();
    }

    function removeVariant(variantId) {
      document.getElementById(variantId).remove();
      variantCount--;
      reindexVariants();
      updateAddVariantButtonVisibility();
      updateSizeOptions();
    }

    function reindexVariants() {
      const variantSections = document.querySelectorAll('.variant-section');
      variantSections.forEach((section, index) => {
        section.id = `variant-${index + 1}`;
        section.querySelector('.form-section-title').textContent = `Variant ${index + 1}`;

        const fields = section.querySelectorAll('input, select');
        fields.forEach(field => {
          const name = field.getAttribute('name');
          if (name) {
            field.setAttribute('name', name.replace(/variants\[\d+\]/, `variants[${index}]`));
          }
        });

        const removeBtn = section.querySelector('.btn-danger');
        if (removeBtn) {
          removeBtn.setAttribute('onclick', `removeVariant('variant-${index + 1}')`);
        }
      });
    }

    function updateAddVariantButtonVisibility() {
      const addBtn = document.getElementById('add-variant-btn');
      if (variantCount >= MAX_VARIANTS) {
        addBtn.style.display = 'none';
      } else {
        addBtn.style.display = 'inline-block';
      }

      document.querySelectorAll('.variant-actions').forEach((actionDiv, index) => {
        const addBtn = actionDiv.querySelector('#add-variant-btn');
        if (addBtn) {
          addBtn.style.display = index === variantCount - 1 ? 'inline-block' : 'none';
        }
      });
    }

    function updateSizeOptions() {
      const sizeSelects = document.querySelectorAll('.variant-size');
      const selectedSizes = Array.from(sizeSelects).map(select => select.value).filter(Boolean);

      sizeSelects.forEach(select => {
        const currentValue = select.value;
        Array.from(select.options).forEach(option => {
          if (option.value && option.value !== currentValue) {
            option.disabled = selectedSizes.includes(option.value);
          } else {
            option.disabled = false;
          }
        });
      });
    }

    // Form Validation
    function displayErrorMessage(element, message) {
      if (element) {
        element.innerText = message;
        element.style.display = 'block';
      }
    }

    function clearErrorMessages() {
      document.querySelectorAll('.error-message').forEach(el => {
        el.innerText = '';
        el.style.display = 'none';
      });
    }

    function validateField(element, fieldConfig = null) {
      const errorElement = document.querySelector(`#${element.id}-error`) || element.parentElement.querySelector('.error-message');
      let isValid = true;
      let errorMessage = '';

      if (element.classList.contains('variant-size')) {
        // Variant size validation
        if (!element.value) {
          isValid = false;
          errorMessage = 'Please select a size.';
        }
      } else if (element.classList.contains('variant-sku')) {
        // SKU validation
        const sku = element.value.trim();
        if (!sku) {
          isValid = false;
          errorMessage = 'SKU is required.';
        } else if (!/^[a-zA-Z0-9-_]+$/.test(sku)) {
          isValid = false;
          errorMessage = 'SKU should contain only alphanumeric characters, hyphens, and underscores.';
        }
      } else if (element.classList.contains('variant-quantity')) {
        // Quantity validation
        const quantity = parseInt(element.value);
        if (isNaN(quantity) || quantity < 0) {
          isValid = false;
          errorMessage = 'Please enter a valid non-negative quantity.';
        }
      } else if (element.classList.contains('variant-sale-price')) {
        // Sale price validation
        const salePriceValue = element.value.trim();
        if (!/^(?!0\d)\d+(\.\d{1,2})?$/.test(salePriceValue) || parseFloat(salePriceValue) <= 0) {
          isValid = false;
          errorMessage = 'Sale price must be a valid number greater than 0, without leading zeros.';
        }
      } else if (fieldConfig) {
        // Basic field validation (e.g., productName, category, etc.)
        if (fieldConfig.required && (!element.value || element.value.trim() === '')) {
          isValid = false;
          errorMessage = `${fieldConfig.name} is required.`;
        } else if (element.id === 'productName') {
          const productName = element.value.trim();
          if (!/^(?=.*[A-Za-z])[A-Za-z\s-]+$/.test(productName)) {
            isValid = false;
            errorMessage = 'Product name must contain only letters, spaces, or hyphens, and include at least one letter.';
          } else if (!/^.{3,100}$/.test(productName)) {
            isValid = false;
            errorMessage = 'Product name must be between 3 and 100 characters.';
          }
        } else if (element.id === 'shortDescription') {
          const shortDescription = element.value.trim();
          if (!/^.{10,200}$/.test(shortDescription)) {
            isValid = false;
            errorMessage = 'Short description must be between 10 and 200 characters.';
          }
        }
      }

      // Display or clear error message
      if (!isValid) {
        displayErrorMessage(errorElement, errorMessage);
      } else {
        errorElement.innerText = '';
        errorElement.style.display = 'none';
      }

      return isValid;
    }

    function validateForm() {
      clearErrorMessages();
      let isValid = true;

      // Basic Information
      const fields = [
        { id: 'productName', name: 'Product Name', required: true },
        { id: 'category', name: 'Category', required: true },
        { id: 'gender', name: 'Gender', required: true },
        { id: 'productType', name: 'Fragrance Type', required: true },
        { id: 'fragranceFamily', name: 'Fragrance Family', required: true },
        { id: 'longevity', name: 'Fragrance Longevity', required: true },
        { id: 'brand', name: 'Brand', required: true },
        { id: 'usage', name: 'Usage', required: true },
        { id: 'shortDescription', name: 'Short Description', required: true },
        { id: 'productDescription', name: 'Description', required: true }
      ];

      fields.forEach(field => {
        const input = document.getElementById(field.id);
        if (!validateField(input, field)) {
          isValid = false;
        }
      });

      // Variant Validation
      const variantSections = document.querySelectorAll('.variant-section');
      if (variantSections.length === 0) {
        displayErrorMessage(document.getElementById('variants-error'), 'At least one product variant is required.');
        isValid = false;
      }

      const sizes = [];
      variantSections.forEach((section) => {
        const sizeSelect = section.querySelector('.variant-size');
        const skuInput = section.querySelector('.variant-sku');
        const quantityInput = section.querySelector('.variant-quantity');
        const salePriceInput = section.querySelector('.variant-sale-price');

        // Size
        if (!validateField(sizeSelect)) {
          isValid = false;
        } else {
          sizes.push(sizeSelect.value);
        }

        // SKU
        if (!validateField(skuInput)) {
          isValid = false;
        }

        // Quantity
        if (!validateField(quantityInput)) {
          isValid = false;
        }

        // Sale Price
        if (!validateField(salePriceInput)) {
          isValid = false;
        }
      });

      // Check for duplicate sizes
      const uniqueSizes = [...new Set(sizes)];
      if (sizes.length !== uniqueSizes.length) {
        displayErrorMessage(document.getElementById('variants-error'), 'Each variant must have a unique size.');
        isValid = false;
      }

      // Image Validation
      const thumbnails = document.querySelectorAll('#croppedThumbnails .thumbnail');
      if (thumbnails.length < 3 || thumbnails.length > 5) {
        displayErrorMessage(document.getElementById('images-error'), 'Please upload between 3 and 5 images.');
        isValid = false;
      }

      return isValid;
    }

    // Real-Time Validation Setup
    function setupRealTimeValidation() {
      const fields = [
        { id: 'productName', name: 'Product Name', required: true },
        { id: 'category', name: 'Category', required: true },
        { id: 'gender', name: 'Gender', required: true },
        { id: 'productType', name: 'Fragrance Type', required: true },
        { id: 'fragranceFamily', name: 'Fragrance Family', required: true },
        { id: 'longevity', name: 'Fragrance Longevity', required: true },
        { id: 'brand', name: 'Brand', required: true },
        { id: 'usage', name: 'Usage', required: true },
        { id: 'shortDescription', name: 'Short Description', required: true },
        { id: 'productDescription', name: 'Description', required: true },
      ];

      // Basic fields
      fields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
          element.addEventListener('input', () => validateField(element, field));
          element.addEventListener('change', () => validateField(element, field));
        }
      });

      // Variant fields (dynamically added, so use event delegation)
      document.getElementById('variants-container').addEventListener('input', (e) => {
        if (
          e.target.classList.contains('variant-size') ||
          e.target.classList.contains('variant-sku') ||
          e.target.classList.contains('variant-quantity') ||
          e.target.classList.contains('variant-sale-price')
        ) {
          validateField(e.target);
        }
      });

      document.getElementById('variants-container').addEventListener('change', (e) => {
        if (e.target.classList.contains('variant-size')) {
          validateField(e.target);
          updateSizeOptions(); // Ensure size options are updated
        }
      });
    }

    // Form Submission with Fetch
    function validateAndSubmit(event) {
      event.preventDefault();
      if (validateForm()) {
        submitForm();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please fill all fields correctly. All fields are required!',
          confirmButtonText: 'OK'
        });
      }
    }

    async function submitForm() {
      const form = document.getElementById('productForm');
      const formData = new FormData();

      // Append form fields (excluding images)
      const inputs = form.querySelectorAll('input:not([type="file"]), select, textarea');
      inputs.forEach(input => {
        formData.append(input.name, input.value);
      });

      // Append cropped image blobs
      const thumbnails = document.querySelectorAll('#croppedThumbnails .thumbnail');
      thumbnails.forEach((thumbnail, index) => {
        const dataUrl = thumbnail.style.backgroundImage.slice(5, -2); // Remove 'url("")'
        const byteString = atob(dataUrl.split(',')[1]);
        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], {
          type: mimeString
        });
        formData.append('images', blob, `cropped-image-${index}.jpg`);
      });

      // Show loading Swal
      Swal.fire({
        title: 'Uploading Product...',
        html: 'Please wait while we save your product.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const response = await fetch('/admin/addproduct', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Product Added',
            text: result.message,
            confirmButtonText: 'OK'
          }).then(() => {
            window.location.href = '/admin/product';
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: result.message,
            confirmButtonText: 'OK'
          });
        }
      } catch (error) {
        console.error('Submission error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Submission Error',
          text: 'An error occurred while submitting the form. Please try again.',
          confirmButtonText: 'OK'
        });
      }
    }

    // Image Cropping and Handling
    let cropper;
    let currentImageIndex = 0;
    let imagesToCrop = [];
    let croppedImages = [];

    function handleFileSelect(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      const totalImages = croppedImages.length + files.length;

      if (totalImages > 5) {
        Swal.fire({
          icon: 'warning',
          title: 'Maximum Limit Reached',
          text: 'You can upload a maximum of 5 images.',
          confirmButtonText: 'OK'
        });
        event.target.value = '';
        return;
      }

      imagesToCrop = [];
      for (let i = 0; i < files.length; i++) {
        if (!allowedFormats.includes(files[i].type)) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid Format',
            text: 'Only PNG, JPEG, and WebP images are allowed.',
            confirmButtonText: 'OK'
          });
          event.target.value = '';
          return;
        }
        imagesToCrop.push(files[i]);
      }

      if (imagesToCrop.length > 0) {
        currentImageIndex = 0;
        processNextImage();
      }
    }

    function processNextImage() {
      if (currentImageIndex >= imagesToCrop.length) {
        // All images have been cropped, close the modal
        closeCropModal();
        return;
      }

      const file = imagesToCrop[currentImageIndex];
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.getElementById('cropImage');
        img.src = e.target.result;
        document.getElementById('cropModal').style.display = 'block';

        if (cropper) {
          cropper.destroy();
        }
        cropper = new Cropper(img, {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.8,
          responsive: true
        });
      };
      reader.readAsDataURL(file);
    }

    function closeCropModal() {
      document.getElementById('cropModal').style.display = 'none';
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      imagesToCrop = [];
      currentImageIndex = 0;
      document.getElementById('productImages').value = '';
    }

    document.getElementById('cropBtn').addEventListener('click', function() {
      if (cropper) {
        const canvas = cropper.getCroppedCanvas({
          width: 300,
          height: 300
        });
        const dataUrl = canvas.toDataURL('image/jpeg');

        const thumbnailWrapper = document.createElement('div');
        thumbnailWrapper.className = 'image-wrapper';
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        thumbnail.style.backgroundImage = `url(${dataUrl})`;
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-image-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = () => removeImage(thumbnailWrapper);

        thumbnailWrapper.appendChild(thumbnail);
        thumbnailWrapper.appendChild(deleteBtn);
        document.getElementById('croppedThumbnails').appendChild(thumbnailWrapper);

        croppedImages.push(dataUrl);

        currentImageIndex++;
        processNextImage();
      }
    });

    function removeImage(thumbnailWrapper) {
      const index = Array.from(document.querySelectorAll('#croppedThumbnails .thumbnail')).findIndex(
        thumb => thumb.parentElement === thumbnailWrapper
      );
      croppedImages.splice(index, 1);
      thumbnailWrapper.remove();
    }

    function scrollToTop() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    window.addEventListener('scroll', function() {
      const btn = document.getElementById('scrollTopBtn');
      btn.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });

    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('variant-size')) {
        updateSizeOptions();
      }
    });

    document.addEventListener('DOMContentLoaded', function() {
      updateSizeOptions();
      updateAddVariantButtonVisibility();
      setupRealTimeValidation();
      $('select[name="category"]').select2();
    });
  