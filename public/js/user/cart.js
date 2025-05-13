
    
  function checkout(redirectUrl) {
    window.location.href = redirectUrl;
  }

    document.addEventListener('DOMContentLoaded', () => {
      // Currency formatter
      const formatCurrency = (value) => `₹${parseFloat(value).toFixed(2)}`;

      // Error popup
      const notyf = new Notyf({
        duration: 2000,
        position: {
          x: 'right',
          y: 'bottom'
        },
      });

      // Show success toast
      const showSuccess = (message = 'Success') => {
        notyf.success(message);
      };

      // Show error toast
      const showError = (message = 'Something went wrong.') => {
        notyf.error(message);
      };
      // Update order summary section
      const updateOrderSummary = (summary) => {
        const orderSummary = document.querySelector('.order-summary');
        if (orderSummary) {
          orderSummary.querySelector('.total-amount').textContent = formatCurrency(summary.total);
          orderSummary.querySelector('.shipping-cost').textContent = formatCurrency(summary.shipping);
          orderSummary.querySelector('.discount-amount').textContent = formatCurrency(summary.discount);
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
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action,
              productId,
              size,
              quantity: newQuantity
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
            toggleQuantityButtons(input);

            // showSuccess(`Quantity updated to ${data.quantity}`);
          } else {
            input.value = input.defaultValue;
            showError(data.message);
          }
        } catch (err) {
          input.value = input.defaultValue;
          showError('Failed to update quantity. Please try again.');
          console.error('Quantity update error:', err);
        } finally {
          buttons.forEach((btn) => (btn.disabled = false)); // Re-enable buttons
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

        if (decreaseBtn) decreaseBtn.disabled = value <= min;
        if (increaseBtn) increaseBtn.disabled = value >= Math.min(max, variantQuantity);
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

        if (newQuantity >= min && newQuantity <= Math.min(max, variantQuantity)) {
          updateQuantity(input, newQuantity, direction);
        } else {
          showError(
            newQuantity < min ?
            'Quantity cannot be less than 1' :
            `Quantity cannot exceed ${Math.min(max, variantQuantity)}`
          );
        }
      };

      // Prevent manual input editing
      document.querySelectorAll('.quantity-input').forEach((input) => {
        input.addEventListener('change', (e) => {
          e.preventDefault();
          input.value = input.defaultValue;
          showError('Please use the buttons to change quantity.');
        });
        input.addEventListener('keydown', (e) => {
          e.preventDefault(); // Prevent typing
        });
        toggleQuantityButtons(input);
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
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    productId,
                    size
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
              showSuccess('Item has been removed.');
              setTimeout(() => location.reload(), 1500);
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
            showSuccess(`Coupon code ${code} copied to clipboard.`);
            document.getElementById('couponInput').value = code;
          }).catch((err) => {
            showError('Failed to copy coupon code.');
            console.error('Coupon copy error:', err);
          });
        });
      });

    
    });

