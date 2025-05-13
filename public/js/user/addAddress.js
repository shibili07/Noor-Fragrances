
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('addAddressForm');

  const inputs = form.querySelectorAll('input, select');
  const progress = document.querySelector('.progress');

  function updateProgress() {
    const totalFields = inputs.length;
    let filledFields = 0;

    inputs.forEach(input => {
      if (input.value.trim() !== '' || (input.type === 'radio' && input.checked) || (input.type === 'checkbox' && input.checked)) {
        filledFields++;
      }
    });

    const progressPercentage = (filledFields / totalFields) * 100;
    progress.style.width = `${progressPercentage}%`;
  }

  inputs.forEach(input => {
    input.addEventListener('input', updateProgress);
    input.addEventListener('change', updateProgress);
  });

  updateProgress();

  // Helper function to check for unique digits
  function countUniqueDigits(value) {
    return new Set(value.split('')).size;
  }

  // Validation rules
  const validationRules = {
    name: {
      pattern: /^[A-Za-z\s]{2,50}$/, // Allows letters and spaces, 2-50 characters
      additionalCheck: (value) => !/(\s{2,})/.test(value), // Disallows consecutive spaces
      message: 'Name must be 2-50 characters, contain only letters and single spaces between words (no hyphens or special characters)'
    },
    phone: {
      pattern: /^[6-9]\d{9}$/, // Must start with 6-9 and be 10 digits
      additionalCheck: (value) => countUniqueDigits(value) >= 3,
      message: 'Phone must be 10 digits starting with 6-9 and contain at least 3 unique digits'
    },
    altPhone: {
      pattern: /^[6-9]\d{9}$/,
      additionalCheck: (value, form) => countUniqueDigits(value) >= 3 && value !== form.querySelector('#phone').value.trim(),
      message: 'Alternative phone must be 10 digits starting with 6-9, at least 3 unique digits, and different from primary phone'
    },
    city: {
      pattern: /^[A-Za-z]{2,50}$/, // Only letters, 2-50 characters
      additionalCheck: () => true,
      message: 'City must be 2-50 characters and contain letters only (no spaces or symbols)'
    },
    state: {
      pattern: /^[A-Za-z]{2,50}$/, // Only letters, 2-50 characters
      additionalCheck: () => true,
      message: 'State must be 2-50 characters and contain letters only (no spaces or symbols)'
    },
    landMark: {
      pattern: /^[A-Za-z0-9,\-\s]{6,100}$/, // Allows letters, numbers, commas, hyphens, and spaces, 2-100 characters
      additionalCheck: (value) => {
        const uniqueChars = new Set(value.replace(/[\s,\-]/g, '')).size; // Count unique alphanumeric characters
        return (
          !/(\s{2,}|,{2,}|-{2,})/.test(value) && // Disallows consecutive spaces, commas, or hyphens
          /[A-Za-z0-9]/.test(value) &&          // Ensures at least one alphanumeric character
          uniqueChars >= 2                      // Requires at least 2 unique alphanumeric characters
        );
      },
      message:
        'Landmark must be 2-100 characters long, containing letters, numbers, commas, hyphens, or spaces, with at least 2 unique alphanumeric characters. Avoid consecutive spaces, commas, or hyphens.'
    },

    pincode: {
      pattern: /^\d{6}$/, // Exactly 6 digits
      additionalCheck: (value) => countUniqueDigits(value) >= 2,
      message: 'Pincode must be 6 digits with at least 2 unique digits'
    },
  };


  // Form validation and submission
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    let isValid = true;
    const errors = [];

    // Validate address type
    const addressType = form.querySelector('input[name="addressType"]:checked');
    const addressTypeError = document.getElementById('addressType-error');
    if (!addressType) {
      addressTypeError.style.display = 'block';
      isValid = false;
      errors.push('Address Type');
    } else {
      addressTypeError.style.display = 'none';
    }

    // Validate all other fields
    Object.keys(validationRules).forEach(fieldId => {
      const input = document.getElementById(fieldId);
      const value = input.value.trim();
      const rule = validationRules[fieldId];

      if (!value) {
        input.classList.add('is-invalid');
        input.nextElementSibling.textContent = 'This field is required';
        isValid = false;
        errors.push(fieldId);
      } else if (!rule.pattern.test(value) || (rule.additionalCheck && !rule.additionalCheck(value, form))) {
        input.classList.add('is-invalid');
        input.nextElementSibling.textContent = rule.message;
        isValid = false;
        errors.push(fieldId);
      } else {
        input.classList.remove('is-invalid');
      }
    });

    if (isValid) {
      const submitBtn = form.querySelector('.submit-btn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const addressData = {
        addressType: formData.get('addressType'),
        name: formData.get('name'),
        phone: formData.get('phone'),
        altPhone: formData.get('altPhone'),
        city: formData.get('city'),
        state: formData.get('state'),
        landMark: formData.get('landMark'),
        pincode: formData.get('pincode'),
        isDefault: formData.has('isDefault')
      };

      Swal.fire({
        title: 'Saving Address...',
        html: 'Please wait while we save your address.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      fetch('/addAddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressData)
      })
        .then(response => response.json())
        .then(data => {
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;

          if (data.success) {
            Swal.fire({
              icon: 'success',
              title: 'Address Added Successfully',
              text: 'Your shipping address has been saved to your account.',
              confirmButtonColor: '#fd334e',
              timer: 3000,
              timerProgressBar: true
            }).then(() => {
              window.location.href = '/address';
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: data.message || 'Something went wrong while saving your address!',
              confirmButtonColor: '#fd334e'
            });
          }
        })
        .catch(error => {
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;

          console.error('Error:', error);
          Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'There was a problem connecting to the server. Please try again.',
            confirmButtonColor: '#fd334e'
          });
        });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Input',
        html: `Please correct the following fields:<br>${errors.map(e => `<b>${e.charAt(0).toUpperCase() + e.slice(1)}</b>`).join('<br>')}`,
        confirmButtonColor: '#fd334e'
      });

      const firstError = form.querySelector('.is-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
      }
    }
  });

  // Real-time validation
  inputs.forEach(input => {
    input.addEventListener('input', function () {
      const rule = validationRules[this.id];
      if (rule) {
        const value = this.value.trim();
        if (!value) {
          this.classList.add('is-invalid');
          this.nextElementSibling.textContent = 'This field is required';
        } else if (!rule.pattern.test(value) || (rule.additionalCheck && !rule.additionalCheck(value, form))) {
          this.classList.add('is-invalid');
          this.nextElementSibling.textContent = rule.message;
        } else {
          this.classList.remove('is-invalid');
        }
      }

      // Real-time phone number comparison
      if (this.id === 'phone' || this.id === 'altPhone') {
        const phone = document.getElementById('phone');
        const altPhone = document.getElementById('altPhone');
        if (phone.value.trim() === altPhone.value.trim() && phone.value.trim() !== '') {
          altPhone.classList.add('is-invalid');
          altPhone.nextElementSibling.textContent = 'Alternative phone must be different from primary';
        } else if (validationRules.altPhone.pattern.test(altPhone.value.trim()) && validationRules.altPhone.additionalCheck(altPhone.value.trim(), form)) {
          altPhone.classList.remove('is-invalid');
        }
      }
    });
  });

  // Address type validation on change
  form.querySelectorAll('input[name="addressType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('addressType-error').style.display = 'none';
    });
  });
});
