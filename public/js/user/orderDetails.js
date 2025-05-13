
  document.addEventListener("DOMContentLoaded", function() {
    // Existing notyf initialization code
    const notyf = new Notyf({
      duration: 3000,
      position: {
        x: "right",
        y: "bottom",
      },
      types: [{
          type: "success",
          background: "#fd334e",
          icon: {
            className: "fas fa-check",
            tagName: "i",
            color: "white",
          },
        },
        {
          type: "error",
          background: "#dc3545",
          icon: {
            className: "fas fa-times",
            tagName: "i",
            color: "white",
          },
        },
      ],
    });

    // Status mapping for progress calculation
    const statusProgress = {
      "Pending": 0,
      "Processing": 1,
      "Shipped": 2,
      "Delivered": 3,
      "Cancelled": -1,
      "Cancel Requested": -1,
      "Return Request": 3,
      "Returned": 3,
      "Return Rejected": 3
    };

    // Get current status from the EJS data
    const currentStatus = "<%= order.status %>";
    const currentStep = statusProgress[currentStatus];

    // Invoice download functionality
    document.getElementById('downloadInvoiceBtn').addEventListener('click', function() {
      generateInvoicePDF();
    });

    // Modified Cancel order functionality
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    if (cancelOrderBtn) {
      cancelOrderBtn.addEventListener('click', function() {
        Swal.fire({
          title: 'Cancel Order',
          html: `
              <p>Please provide a reason for cancellation:</p>
              <textarea id="cancellationReason" class="swal2-textarea" placeholder="Enter your reason here..."></textarea>
            `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#fd334e',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, Cancel Order',
          cancelButtonText: 'No, Keep Order',
          preConfirm: () => {
            const reason = document.getElementById('cancellationReason').value;
            if (!reason.trim()) {
              Swal.showValidationMessage('Please provide a cancellation reason');
              return false;
            }
            return reason;
          }
        }).then((result) => {
          if (result.isConfirmed) {
            const cancellationReason = result.value;

            fetch('/cancelOrder/<%= order._id %>', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reason: cancellationReason
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  Swal.fire(
                    'Order Cancelled!',
                    'Your Order has been Cancelled.',
                    'success'
                  ).then(() => {
                    window.location.reload();
                  });
                } else {
                  Swal.fire(
                    'Error!',
                    data.message || 'There was an error cancelling your order.',
                    'error'
                  );
                }
              })
              .catch(error => {
                console.error('Error:', error);
                Swal.fire(
                  'Error!',
                  'There was an error processing your request.',
                  'error'
                );
              });
          }
        });
      });
    }

    // Return order functionality
    const returnOrderBtn = document.getElementById('returnOrderBtn');
    if (returnOrderBtn) {
      returnOrderBtn.addEventListener('click', function() {
        Swal.fire({
          title: 'Return Order',
          html: `
            <p>Please provide a reason for returning the product:</p>
            <textarea id="returnReason" class="swal2-textarea" placeholder="Enter your reason here..."></textarea>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#fd334e',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, Return Order',
          cancelButtonText: 'No, Keep Order',
          preConfirm: () => {
            const reason = document.getElementById('returnReason').value;
            if (!reason.trim()) {
              Swal.showValidationMessage('Please provide a return reason');
              return false;
            }
            return reason;
          }
        }).then((result) => {
          if (result.isConfirmed) {
            const returnReason = result.value;

            fetch('/returnOrder/<%= order._id %>', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reason: returnReason
                })
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  Swal.fire(
                    'Return Requested!',
                    'Your return request has been submitted.',
                    'success'
                  ).then(() => {
                    window.location.reload();
                  });
                } else {
                  Swal.fire(
                    'Error!',
                    data.message || 'There was an error processing your return.',
                    'error'
                  );
                }
              })
              .catch(error => {
                console.error('Error:', error);
                Swal.fire(
                  'Error!',
                  'There was an error submitting your return request.',
                  'error'
                );
              });
          }
        });
      });
    }

    // Product order cancel function
    window.productOrderCancel = function(productId, sku) {
      Swal.fire({
        title: 'Cancel This Item?',
        html: `
          <p>Please provide a reason for cancelling this item:</p>
          <textarea id="cancellationReason" class="swal2-textarea" placeholder="Enter your reason here..."></textarea>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fd334e',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Cancel Item',
        cancelButtonText: 'No, Keep It',
        preConfirm: () => {
          const reason = document.getElementById('cancellationReason').value;
          if (!reason.trim()) {
            Swal.showValidationMessage('Please provide a cancellation reason');
            return false;
          }
          return reason;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const cancellationReason = result.value;

          fetch(`/productCancelOrder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reason: cancellationReason,
                orderId: '<%= order._id %>',
                productId: productId,
                sku
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                Swal.fire(
                  'Cancelled!',
                  'The item has been cancelled.',
                  'success'
                ).then(() => window.location.reload());
              } else {
                Swal.fire(
                  'Error!',
                  data.message || 'Could not cancel the item.',
                  'error'
                );
              }
            })
            .catch(err => {
              console.error(err);
              Swal.fire('Error!', 'Something went wrong.', 'error');
            });
        }
      });
    }

    // Product order return function
    window.productOrderReturn = function(orderId, productId, sku) {
      Swal.fire({
        title: 'Return This Item?',
        html: `
          <p>Please provide a reason for returning this item:</p>
          <textarea id="returnReason" class="swal2-textarea" placeholder="Enter your reason here..."></textarea>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#fd334e',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, Return Item',
        cancelButtonText: 'No, Keep It',
        preConfirm: () => {
          const reason = document.getElementById('returnReason').value;
          if (!reason.trim()) {
            Swal.showValidationMessage('Please provide a return reason');
            return false;
          }
          return reason;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const returnReason = result.value;

          fetch(`/productReturnOrder`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                reason: returnReason,
                orderId: orderId,
                productId: productId,
                sku: sku
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                Swal.fire(
                  'Return Requested!',
                  'Your return request for the item has been submitted.',
                  'success'
                ).then(() => window.location.reload());
              } else {
                Swal.fire(
                  'Error!',
                  data.message || 'Could not process the return request.',
                  'error'
                );
              }
            })
            .catch(err => {
              console.error(err);
              Swal.fire('Error!', 'Something went wrong.', 'error');
            });
        }
      });
    }

   

    function openRetryPaymentModal(orderId) {
      console.log('Opening retry payment modal for order:', orderId);
      currentOrderId = orderId;
      document.getElementById('retryPaymentModal').style.display = 'flex';
    }

    function closeRetryPaymentModal() {
      document.getElementById('retryPaymentModal').style.display = 'none';
    }


    
    async function initiateRetryPayment() {
  if (!currentOrderId) {
    notyf.error('No order selected for payment.');
    closeRetryPaymentModal();
    return;
  }

  try {
    const response = await fetch('/retryRazorpayPayment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId: currentOrderId }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();

    if (!data.success) {
      notyf.error(data.message || 'Failed to initiate payment.');
      closeRetryPaymentModal();
      return;
    }

    const options = {
      key: data.razorpayKey, // Use key from server
      amount: data.amount * 100,
      currency: 'INR',
      name: 'NOOR Fragrance',
      description: `Retry Payment for Order #${currentOrderId}`,
      order_id: data.razorpayOrderId,
      handler: async function (response) {
        try {
          const verifyResponse = await fetch('/verifyRetryPayment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: currentOrderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          if (!verifyResponse.ok) {
            throw new Error('Verification response was not ok');
          }

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            notyf.success('Payment successful!');
            window.location.href = verifyData.redirect;
          } else {
            notyf.error(verifyData.message || 'Payment verification failed.');
            window.location.href = verifyData.redirect;
          }
        } catch (error) {
          console.error('Error verifying payment:', error);
          notyf.error('Failed to verify payment.');
          window.location.href = `/orderFailed?orderId=${currentOrderId}&message=${encodeURIComponent('Payment verification failed.')}&errorCode=PAYMENT_VERIFICATION_FAILED`;
        }
      },
      prefill: {
        name: '<%= order.address.name %>',
        email: '<%= user.email %>',
        contact: '<%= order.address.phone %>',
      },
      theme: {
        color: '#fd334e',
      },
      modal: {
        ondismiss: async () => {
          try {
            await fetch('/updateFailedPayment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: currentOrderId,
                errorCode: 'PAYMENT_CANCELLED',
                errorDescription: 'Payment cancelled by user.',
              }),
            });
          } catch (error) {
            console.error('Error notifying server of cancelled payment:', error);
          }

          notyf.error('Payment cancelled by user.');
          window.location.href = `/orderFailed?orderId=${currentOrderId}&message=${encodeURIComponent('Payment cancelled by user.')}&errorCode=PAYMENT_CANCELLED`;
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', async function (response) {
      try {
        await fetch('/updateFailedPayment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: currentOrderId,
            errorCode: response.error.code || 'PAYMENT_FAILED',
            errorDescription: response.error.description || 'Payment failed.',
          }),
        });
      } catch (error) {
        console.error('Error notifying server of failed payment:', error);
      }

      notyf.error(response.error.description || 'Payment failed.');
      window.location.href = `/orderFailed?orderId=${currentOrderId}&message=${encodeURIComponent(response.error.description || 'Payment failed.')}&errorCode=${response.error.code || 'PAYMENT_FAILED'}`;
    });

    rzp.open();
    closeRetryPaymentModal();
  } catch (error) {
    console.error('Error initiating retry payment:', error);
    notyf.error('Failed to initiate payment.');
    closeRetryPaymentModal();
  }
}


    // Bind Retry Payment Button
    const retryBtn = document.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        const orderId = this.dataset.orderId;
        openRetryPaymentModal(orderId);
      });
    }

    // Bind Modal Close Button
    document.getElementById('closeRetryPaymentModal').addEventListener('click', closeRetryPaymentModal);

    // Bind Pay Now Button
    document.getElementById('payNowBtn').addEventListener('click', initiateRetryPayment);

    // Function to generate PDF invoice
    function generateInvoicePDF() {
      const { jsPDF } = window.jspdf;
      const element = document.getElementById('invoice-template');
      element.style.display = 'block';

      html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true
      }).then(canvas => {
        element.style.display = 'none';
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`NOOR_Invoice_<%= order.orderId %>.pdf`);
        notyf.success('Invoice downloaded successfully!');
      }).catch(error => {
        console.error('Error generating PDF:', error);
        notyf.error('Error generating invoice.');
      });
    }
  });

  
