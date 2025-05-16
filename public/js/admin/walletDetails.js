 
      document.addEventListener('DOMContentLoaded', function() {
        // Handle view details button click
        document.querySelectorAll('.view-details-button').forEach(button => {
          button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-order-id');
            
            // Fetch transaction details from backend
            fetch(`/admin/transactionDetails/${orderId}`)
              .then(response => response.json())
              .then(data => {
                // Update modal content dynamically
                document.getElementById('order-id').textContent = data.orderId || 'N/A';
                
                // Status
                const statusElement = document.getElementById('order-status');
                statusElement.textContent = data.status || 'N/A';
                statusElement.className = 'transaction-status';
                if (data.status === 'Completed') {
                  statusElement.classList.add('status-completed');
                } else if (data.status === 'Cancelled') {
                  statusElement.classList.add('status-cancelled');
                } else if (data.status === 'Pending') {
                  statusElement.classList.add('status-pending');
                }
                
                // Cancellation Reason
                document.getElementById('cancellation-reason').textContent = data.cancellationReason || 'N/A';
                
                // Shipping Address
                document.getElementById('address-name').textContent = data.shippingAddress?.name || 'N/A';
                document.getElementById('address-details').textContent = data.shippingAddress?.details || 'N/A';
                document.getElementById('address-mobile').textContent = data.shippingAddress?.mobile ? `Mobile: ${data.shippingAddress.mobile}` : 'N/A';
                
                // Ordered Items
                const itemsContainer = document.getElementById('ordered-items');
                itemsContainer.innerHTML = '';
                if (data.items && data.items.length > 0) {
                  data.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'ordered-item mt-2 p-3 bg-light rounded';
                    itemElement.innerHTML = `
                      <div class="d-flex justify-content-between">
                        <div>
                          <p class="mb-1"><strong>Product Name:</strong> ${item.productName || 'N/A'}</p>
                          <p class="mb-1"><strong>Quantity:</strong> ${item.quantity || 'N/A'}</p>
                          <p class="mb-1"><strong>Price:</strong> ₹${item.price?.toFixed(2) || '0.00'}</p>
                          <p class="mb-1"><strong>Offer Discount:</strong> ₹${item.offerDiscount?.toFixed(2) || '0.00'}</p>
                          <p class="mb-0"><strong>Status:</strong> <span class="transaction-status ${item.status === 'Cancelled' ? 'status-cancelled' : item.status === 'Completed' ? 'status-completed' : 'status-pending'}">${item.status || 'N/A'}</span></p>
                        </div>
                      </div>
                    `;
                    itemsContainer.appendChild(itemElement);
                  });
                } else {
                  itemsContainer.innerHTML = '<p>No items available</p>';
                }
                
                // Payment Method
                document.getElementById('payment-method-text').textContent = data.paymentMethod || 'N/A';
                
                // Price Details
                document.getElementById('total-price').textContent = `₹${data.totalPrice?.toFixed(2) || '0.00'}`;
                document.getElementById('discount').textContent = `₹${data.discount?.toFixed(2) || '0.00'}`;
                document.getElementById('final-amount').textContent = `₹${data.finalAmount?.toFixed(2) || '0.00'}`;
                
                // Returned Amount
                const returnedAmountElement = document.getElementById('returned-amount');
                returnedAmountElement.textContent = `₹${data.returnedAmount?.toFixed(2) || '0.00'}`;
                returnedAmountElement.className = 'detail-value';
                if (data.returnedAmount > 0) {
                  returnedAmountElement.classList.add('amount-credit');
                } else if (data.returnedAmount < 0) {
                  returnedAmountElement.classList.add('amount-debit');
                }
                
                // Coupon Applied
                document.getElementById('coupon-applied').textContent = data.couponApplied || 'None';
              })
              .catch(error => {
                console.error('Error fetching transaction details:', error);
                alert('Failed to load transaction details. Please try again.');
              });
          });
        });

        // Print receipt functionality
        document.querySelector('.print-btn').addEventListener('click', function() {
          window.print();
        });
      });
    