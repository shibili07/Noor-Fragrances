function checkout(redirectUrl) {
  window.location.href = redirectUrl;
}

document.addEventListener('DOMContentLoaded', () => {
  // Currency formatter
  const formatCurrency = (value) => `₹${parseFloat(value).toFixed(2)}`;

  // Update order summary section
  const updateOrderSummary = (summary) => {
    const orderSummary = document.querySelector('.order-summary');
    if (orderSummary) {
      orderSummary.querySelector('.total-amount').textContent = formatCurrency(summary.total);
      orderSummary.querySelector('.shipping-cost').textContent = formatCurrency(summary.shipping);
      orderSummary.querySelector('.discount-amount').textContent = `-${formatCurrency(summary.discount)}`;
      orderSummary.querySelector('.grand-total').textContent = formatCurrency(summary.grandTotal);
    }
  };

  // Update price and offer display
  const updatePriceDisplay = (row, data) => {
    const priceCell = row.querySelector('.price');
    const offerCell = row.querySelector('.offer');
    if (data.offerPercentage > 0) {
      priceCell.innerHTML = `
        <span class="original-price">₹${data.originalPrice.toFixed(2)}</span>
        <span class="discounted-price">₹${data.discountedPrice.toFixed(2)}</span>
      `;
      offerCell.innerHTML = `<span>${data.offerPercentage}% OFF</span>`;
    } else {
      priceCell.innerHTML = `<span class="discounted-price">₹${data.discountedPrice.toFixed(2)}</span>`;
      offerCell.innerHTML = `<span>No offers available</span>`;
    }
  };

  // Send quantity update to backend
  const updateQuantity = async (input, newQuantity, action) => {
    const productId = input.dataset.productId;
    const size = input.dataset.size;
    const row = input.closest('tr');
    const buttons = row.querySelectorAll('.quantity-btn');
    buttons.forEach((btn) => (btn.disabled = true)); // Disable buttons during request

    try {
      const response = await fetch('/cartQuantityCheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          productId,
          size,
          quantity: newQuantity,
        }),
      });

      const data = await response.json();

      if (data.success) {
        input.value = data.quantity;
        input.defaultValue = data.quantity;

        row.querySelector('.subtotal-value').textContent = data.subtotal;
        row.querySelector('.subtotal-input').value = data.subtotal;

        updateOrderSummary(data.orderSummary);
        updatePriceDisplay(row, data);
        toggleQuantityButtons(input); // Enable/disable buttons based on new quantity
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Quantity updated to ${data.quantity}`,
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        input.value = input.defaultValue;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message,
          timer: 3000,
          showConfirmButton: false,
        });
        toggleQuantityButtons(input); // Ensure buttons reflect current state
      }
    } catch (err) {
      input.value = input.defaultValue;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update quantity. Please try again.',
        timer: 3000,
        showConfirmButton: false,
      });
      console.error('Quantity update error:', err);
      toggleQuantityButtons(input); // Ensure buttons reflect current state
    } finally {
      buttons.forEach((btn) => (btn.disabled = false)); // Re-enable buttons unless toggled
    }
  };

  // Enable/disable + and - buttons based on stock and limits
  const toggleQuantityButtons = (input) => {
    const container = input.parentElement;
    const value = parseInt(input.value);
    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || 5;
    const row = input.closest('tr');
    const variantQuantity = parseInt(row.dataset.variantQuantity) || max;

    const decreaseBtn = container.querySelector('[data-action="decrease"]');
    const increaseBtn = container.querySelector('[data-action="increase"]');
    
    
    // // Only disable buttons if quantity is at the absolute limits
    // if (decreaseBtn) decreaseBtn.disabled = value <= min;
    // if (increaseBtn) increaseBtn.disabled = value >= Math.min(max, variantQuantity);
  };

  // Unified quantity change logic
  const changeQuantity = (button, direction) => {
    const input = button.parentElement.querySelector('.quantity-input');
    const current = parseInt(input.value);
    const min = parseInt(input.min) || 1;
    const max = parseInt(input.max) || 5;
    const row = input.closest('tr');
    const variantQuantity = parseInt(row.dataset.variantQuantity) || max;
    const newQuantity = direction === 'increase' ? current + 1 : current - 1;
    
    if (newQuantity > max) {
    Swal.fire({
        icon: 'warning',
        title: 'Limit Exceeded',
        text: 'Quantity cannot exceed 5',
        confirmButtonText: 'OK'
    });
    return; 
}


    if (newQuantity >= min && newQuantity <= Math.min(max, variantQuantity)) {
      updateQuantity(input, newQuantity, direction);
    } else {
      const productName = row.querySelector('.product-info .title').textContent.trim();
      Swal.fire({
        icon: 'warning',
        title: 'Quantity Limit',
        text:
          newQuantity < min
            ? 'Quantity cannot be less than 1'
            : `Only ${variantQuantity} stock is available for ${productName}`,
        timer: 3000,
        showConfirmButton: false,
      });
      // Do not disable buttons here; let backend response handle it
    }
  };

  // Prevent manual input editing
  document.querySelectorAll('.quantity-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      e.preventDefault();
      input.value = input.defaultValue;
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Action',
        text: 'Please use the buttons to change quantity.',
        timer: 2000,
        showConfirmButton: false,
      });
    });
    input.addEventListener('keydown', (e) => {
      e.preventDefault(); // Prevent typing
    });
    // Do NOT call toggleQuantityButtons here to avoid initial disabling
  });

  // Handle clicks on + and - buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('quantity-btn')) {
      const action = e.target.dataset.action;
      if (action === 'increase' || action === 'decrease') {
        changeQuantity(e.target, action);
      }
    }
  });

  // Delete item from cart
  document.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = button.dataset.id;
      const size = button.dataset.size;

      Swal.fire({
        title: 'Are you sure?',
        text: 'This product will be removed from the cart.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            const response = await fetch('/deleteFromCart', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                productId,
                size,
              }),
            });
            const data = await response.json();
            if (!data.success) {
              throw new Error(data.message);
            }
            return data;
          } catch (err) {
            Swal.showValidationMessage(`Failed to delete: ${err.message}`);
          }
        },
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            icon: 'success',
            title: 'Success',
            title: 'Success',
            text: 'Item has been removed.',
            timer: 1500,
            showConfirmButton: false,
          }).then(() => {
            location.reload();
          });
        }
      });
    });
  });

  // Coupon toggle
  const toggleCouponsBtn = document.getElementById('toggleCoupons');
  if (toggleCouponsBtn) {
    toggleCouponsBtn.addEventListener('click', () => {
      const container = document.getElementById('couponsContainer');
      toggleCouponsBtn.classList.toggle('open');
      container.classList.toggle('open');
    });
  }

  // Copy coupon to clipboard
  document.querySelectorAll('.copy-coupon-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.dataset.code;
      navigator.clipboard.writeText(code).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Coupon code ${code} copied to clipboard.`,
          timer: 2000,
          showConfirmButton: false,
        });
        document.getElementById('couponInput').value = code;
      }).catch((err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to copy coupon code.',
          timer: 3000,
          showConfirmButton: false,
        });
        console.error('Coupon copy error:', err);
      });
    });
  });
});