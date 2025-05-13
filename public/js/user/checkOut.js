
// Coupon modal
const modal = document.getElementById('couponModal');
const showCouponsBtn = document.getElementById('showCouponsBtn');
const closeModal = document.getElementById('closeModal');

if (showCouponsBtn) {
  showCouponsBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});

document.querySelectorAll('.coupon-copy').forEach(button => {
  button.addEventListener('click', () => {
    const code = button.getAttribute('data-code');
    navigator.clipboard.writeText(code).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Coupon Copied!',
        text: `Code ${code} copied to clipboard.`,
        timer: 1500,
        showConfirmButton: false,
      });
      document.getElementById('couponCode').value = code;
      modal.style.display = 'none';
    });
  });
});

// Coupon apply logic
const applyCouponBtn = document.getElementById('applyCouponBtn');
if (applyCouponBtn) {
applyCouponBtn.addEventListener('click', async () => {
const couponCode = document.getElementById('couponCode').value.trim();
const messageDiv = document.getElementById('couponMessage');
const grandTotalSpan = document.getElementById('grandTotal');
const couponCodeHidden = document.getElementById('couponCodeHidden');

if (!couponCode) {
  messageDiv.innerHTML = `<p class="text-danger">Please enter a coupon code.</p>`;
  Swal.fire({
    icon: 'warning',
    title: 'No Coupon Entered',
    text: 'Please enter a coupon code to apply.',
  });
  return;
}

try {
  const response = await fetch('/apply-coupon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ couponCode }),
  });
  const data = await response.json();

  if (data.success) {
    messageDiv.innerHTML = `<p class="text-success">Coupon applied: ${data.coupon.name}</p>`;
    grandTotalSpan.textContent = `₹${data.grandTotal}`;
    couponCodeHidden.value = couponCode;

    // Update summary totals
    document.querySelector('.summary-totals').innerHTML = `
      <div class="summary-row">
        <span class="summary-key">Subtotal</span>
        <span class="summary-value">₹${data.subtotal}</span>
      </div>
      <div class="summary-row savings-row">
        <span class="summary-key">Savings</span>
        <span class="summary-value"><i class="fas fa-tag"></i> -₹${data.savings}</span>
      </div>
      <div class="summary-row">
        <span class="summary-key">Shipping</span>
        <span class="summary-value">₹0.00</span>
      </div>
      <div class="summary-discount">
        <span class="summary-key">Coupon (${data.coupon.code})</span>
        <div>
          <span class="summary-value"><i class="fas fa-ticket-alt"></i> -₹${data.couponDiscount}</span>
          <button type="button" id="removeCouponBtn" class="remove-coupon-btn">Remove</button>
        </div>
      </div>
      <div class="grand-total">
        <span>Grand Total</span>
        <span id="grandTotal">₹${data.grandTotal}</span>
      </div>
      <input type="hidden" name="cartId" value="<%= cart && cart._id ? cart._id : '' %>">
      <input type="hidden" name="couponCode" id="couponCodeHidden" value="${couponCode}">
    `;

    Swal.fire({
      icon: 'success',
      title: 'Coupon Applied!',
      text: `Coupon ${data.coupon.code} applied successfully. You saved ₹${data.couponDiscount}.`,
    });

    // Re-attach remove coupon event listener
    attachRemoveCouponListener();
  } else {
    messageDiv.innerHTML = `<p class="text-danger">${data.message}</p>`;
    Swal.fire({
      icon: 'error',
      title: 'Invalid Coupon',
      text: data.message,
    });
  }
} catch (error) {
  messageDiv.innerHTML = `<p class="text-danger">Error applying coupon.</p>`;
  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: 'An error occurred while applying the coupon.',
  });
}
});
}

// Remove coupon logic
function attachRemoveCouponListener() {
const removeCouponBtn = document.getElementById('removeCouponBtn');
if (removeCouponBtn) {
removeCouponBtn.addEventListener('click', async () => {
  const messageDiv = document.getElementById('couponMessage');
  const grandTotalSpan = document.getElementById('grandTotal');
  const couponCodeInput = document.getElementById('couponCode');
  const couponCodeHidden = document.getElementById('couponCodeHidden');

  try {
    const response = await fetch('/remove-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (data.success) {
      messageDiv.innerHTML = `<p class="text-success">Coupon removed successfully.</p>`;
      grandTotalSpan.textContent = `₹${data.grandTotal}`;
      couponCodeInput.value = '';
      couponCodeHidden.value = '';

      // Update summary totals
      document.querySelector('.summary-totals').innerHTML = `
        <div class="summary-row">
          <span class="summary-key">Subtotal</span>
          <span class="summary-value">₹${data.subtotal}</span>
        </div>
        <div class="summary-row savings-row">
          <span class="summary-key">Savings</span>
          <span class="summary-value"><i class="fas fa-tag"></i> -₹${data.savings}</span>
        </div>
        <div class="summary-row">
          <span class="summary-key">Shipping</span>
          <span class="summary-value">₹0.00</span>
        </div>
        <div class="grand-total">
          <span>Grand Total</span>
          <span id="grandTotal">₹${data.grandTotal}</span>
        </div>
        <input type="hidden" name="cartId" value="<%= cart && cart._id ? cart._id : '' %>">
        <input type="hidden" name="couponCode" id="couponCodeHidden" value="">
      `;

      Swal.fire({
        icon: 'success',
        title: 'Coupon Removed',
        text: 'The coupon has been removed successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      messageDiv.innerHTML = `<p class="text-danger">${data.error}</p>`;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: data.error,
      });
    }
  } catch (error) {
    messageDiv.innerHTML = `<p class="text-danger">Error removing coupon.</p>`;
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'An error occurred while removing the coupon.',
    });
  }
});
}
}

// Attach remove coupon listener on page load if coupon is applied
attachRemoveCouponListener();

// Address selection highlighting
document.querySelectorAll('.address-card').forEach(card => {
  const radio = card.querySelector('.address-radio');
  if (radio) {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.address-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  }
});

// Payment method highlighting
document.querySelectorAll('.payment-option').forEach(option => {
  const radio = option.querySelector('.payment-radio');
  if (radio) {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
  }
});

// Consolidated form submission logic
const orderForm = document.getElementById('orderForm');
if (orderForm) {
  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const paymentBtn = document.querySelector('.payment-now-btn');
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    const cartId = document.querySelector('input[name="cartId"]').value;
    const couponCode = document.getElementById('couponCodeHidden').value;

    // Validation
    if (!selectedAddress) {
      Swal.fire({
        icon: 'warning',
        title: 'No Address Selected',
        text: 'Please select a delivery address.',
      });
      return;
    }
    if (!selectedPayment) {
      Swal.fire({
        icon: 'warning',
        title: 'No Payment Method Selected',
        text: 'Please select a payment method.',
      });
      return;
    }
    if (!cartId) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Cart',
        text: 'Invalid cart. Please refresh and try again.',
      });
      return;
    }

    paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking Stock...';
    paymentBtn.disabled = true;

    try {
      // Check stock availability
      const stockResponse = await fetch('/checkoutQuantity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cartId
        }),
      });

      const stockResult = await stockResponse.json();

      if (!stockResponse.ok || !stockResult.success) {
        Swal.fire({
          icon: 'error',
          title: 'Stock Unavailable',
          text: stockResult.message || 'Some items in your cart are out of stock. Please update your cart.',
          confirmButtonText: 'Go to Cart',
        }).then(() => {
          window.location.href = '/cart';
        });
        paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
        paymentBtn.disabled = false;
        return;
      }

      paymentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

      const data = {
        cartId,
        address: selectedAddress.value,
        payment: selectedPayment.value,
        couponCode,
      };


      // Handle Razorpay payment
      if (selectedPayment.value === 'razorpay') {
        // Handle Razorpay payment
        const response = await fetch('/checkout/razorpay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Open Razorpay checkout
          const options = {
            key: '<%= process.env.RAZORPAY_KEY_ID %>',
            amount: result.amount * 100, // Amount in paise
            currency: 'INR',
            name: 'Noor Fragrance',
            description: `Cart ${result.cartId}`,
            order_id: result.razorpayOrderId,
            handler: async function (response) {
              try {
                // Verify payment
                const verifyResponse = await fetch('/verifyPayment', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    cartId: result.cartId,
                    address: result.address,
                    couponCode: result.couponCode,
                  }),
                });

                const verifyResult = await verifyResponse.json();

                if (verifyResponse.ok && verifyResult.success) {
                  Swal.fire({
                    icon: 'success',
                    title: 'Payment Successful!',
                    text: 'Your order has been placed.',
                    timer: 2000,
                    showConfirmButton: false,
                  }).then(() => {
                    window.location.href = `/orderSuccess?orderId=${verifyResult.orderId}`;
                  });
                } else {
                  window.location.href = `/orderFailed?orderId=${verifyResult.orderId || ''}&errorCode=${verifyResult.errorCode || 'PAYMENT_VERIFICATION_FAILED'
                    }&message=${encodeURIComponent(verifyResult.message || 'Payment verification failed')}`;
                }
              } catch (error) {
                console.error('Payment verification error:', error);
                window.location.href = `/orderFailed?errorCode=VERIFICATION_ERROR&message=${encodeURIComponent(
                  'Error verifying payment'
                )}`;
              }
            },
            prefill: {
              name: '<%= user.name %>',
              email: '<%= user.email %>',
              contact: '<%= user.phone %>',
            },
            theme: {
              color: '#ff3e6c',
            },
            modal: {
              ondismiss: function () {
                paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
                paymentBtn.disabled = false;
              },
            },
          };

          const rzp = new Razorpay(options);
          rzp.on('payment.failed', function (response) {
            const error = response.error;
            // Create failed order
            fetch('/verifyPayment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id || null,
                razorpay_order_id: response.razorpay_order_id || result.razorpayOrderId,
                razorpay_signature: null,
                cartId: result.cartId,
                address: result.address,
                couponCode: result.couponCode,
              }),
            })
              .then((verifyResponse) => verifyResponse.json())
              .then((verifyResult) => {
                window.location.href = `/orderFailed?orderId=${verifyResult.orderId || ''}&errorCode=${error.code || 'PAYMENT_FAILED'
                  }&message=${encodeURIComponent(error.description || 'Payment failed')}`;
              })
              .catch(() => {
                window.location.href = `/orderFailed?errorCode=${error.code || 'PAYMENT_FAILED'
                  }&message=${encodeURIComponent(error.description || 'Payment failed')}`;
              });
          });

          rzp.on('modal.dismiss', function () {
            paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
            paymentBtn.disabled = false;
          });

          rzp.open();
        } else {
          window.location.href = `/orderFailed?errorCode=${result.errorCode || 'PAYMENT_INIT_FAILED'
            }&message=${encodeURIComponent(result.message || 'Failed to initiate payment')}`;
        }


      } else if (selectedPayment.value === 'wallet') {
        // Handle wallet payment
        const response = await fetch('/checkout/wallet', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Order Placed!',
            text: 'Your order has been placed successfully using wallet balance.',
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = `/orderSuccess?orderId=${result.orderId}`;
          });
        } else {
          if (result.errorCode === 'INSUFFICIENT_BALANCE') {
            Swal.fire({
              icon: 'error',
              title: 'Insufficient Balance',
              html: `Your wallet balance (₹${result.availableBalance}) is insufficient for this order (₹${result.requiredAmount}).<br>Please choose another payment method.`,
              confirmButtonText: 'Choose Another Method'
            }).then(() => {
              paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
              paymentBtn.disabled = false;
            });
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Payment Failed',
              text: result.message || 'Failed to process wallet payment',
            }).then(() => {
              paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
              paymentBtn.disabled = false;
            });
          }
        }
      } else {
        const amountString = document.getElementById("grandTotal").textContent;
        const numericAmount = amountString.replace(/[^\d.-]/g, ''); 
        const amount = parseFloat(numericAmount);

        if (amount < 1000) {
          e.preventDefault(); 
          Swal.fire({
            icon: 'warning',
            title: 'COD Unavailable',
            text: 'Cash on Delivery is only available for orders above ₹1,000.',
            confirmButtonText: 'OK'
          });
          paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
          paymentBtn.disabled = false;
          return; 
        }

        // Handle COD payment
        const response = await fetch('/cod', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          Swal.fire({
            icon: 'success',
            title: 'Order Placed!',
            text: result.message,
            timer: 2000,
            showConfirmButton: false,
          }).then(() => {
            window.location.href = `/orderSuccess?orderId=${result.orderId}`;
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Order Failed',
            text: result.message || 'Failed to place order.',
          });
          paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
          paymentBtn.disabled = false;
        }
      }
    } catch (error) {
      console.error('Order error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while placing the order.',
      });
      paymentBtn.innerHTML = '<i class="fas fa-check-circle"></i> Place Order';
      paymentBtn.disabled = false;
    }
  });
}
