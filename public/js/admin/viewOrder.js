
            document.addEventListener('DOMContentLoaded', function () {
                // Status update form handler
                document.querySelector("#statusUpdateForm").addEventListener("submit", async function (event) {
                    event.preventDefault(); // Prevent default form submission

                    const form = event.target;
                    const status = form.querySelector("select[name='status']").value;
                    const orderId = form.querySelector("input[name='orderId']").value;

                    try {
                        const response = await fetch(form.action, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ status, orderId })
                        });

                        const result = await response.json();

                        if (result.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Status Updated!',
                                text: 'The order status has been successfully updated.',
                                confirmButtonColor: '#5e5ce6'
                            }).then(() => {
                                location.reload();  // Reload page after showing success
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Update Failed',
                                text: result.message || 'Something went wrong.',
                                confirmButtonColor: '#ff3b30'
                            });
                        }
                    } catch (error) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Network Error',
                            text: 'Could not update the status due to a network error.',
                            confirmButtonColor: '#ff3b30'
                        });
                    }
                });

                // Handle simple return submission (without fetch)


                // Check for sidebar status
                function checkSidebar() {
                    const sidebar = document.querySelector('.sidebar');
                    if (sidebar && sidebar.classList.contains('collapsed')) {
                        document.body.classList.add('sidebar-collapsed');
                    } else {
                        document.body.classList.remove('sidebar-collapsed');
                    }
                }

                // Initial check
                checkSidebar();

                // Listen for sidebar toggle events
                const sidebarToggle = document.querySelector('.sidebar-toggle');
                if (sidebarToggle) {
                    sidebarToggle.addEventListener('click', function () {
                        setTimeout(checkSidebar, 50);
                    });
                }

                // Listen for window resize
                window.addEventListener('resize', checkSidebar);
            });

            // Add to existing JavaScript in viewOrder.ejs
document.querySelectorAll('.return-action-accept-btn').forEach(button => {
    button.addEventListener('click', async function() {
        const action = this.getAttribute('data-action');
        const orderId = this.getAttribute('data-order-id');
        const itemId = this.getAttribute('data-item-id');

        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to ${action} this return request?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#34c759',
            cancelButtonColor: '#ff3b30',
            confirmButtonText: `Yes, ${action} it!`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch('/admin/return-accept', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId, itemId, action })
                    });

                    const result = await response.json();

                    if (result.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: result.message,
                            confirmButtonColor: '#5e5ce6'
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: result.message,
                            confirmButtonColor: '#ff3b30'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Could not process the return request.',
                        confirmButtonColor: '#ff3b30'
                    });
                }
            }
        });
    });
});
      

document.querySelectorAll('.return-action-reject-btn').forEach(button => {
    button.addEventListener('click', async function() {
        const action = this.getAttribute('data-action');
        const orderId = this.getAttribute('data-order-id');
        const itemId = this.getAttribute('data-item-id');

        Swal.fire({
            title: 'Reject Return Request',
            text: `Please provide a reason for rejecting this return request:`,
            input: 'textarea',
            inputPlaceholder: 'Enter reason here...',
            inputAttributes: {
                'aria-label': 'Rejection reason'
            },
            showCancelButton: true,
            confirmButtonColor: '#34c759',
            cancelButtonColor: '#ff3b30',
            confirmButtonText: `Reject Request`
        }).then(async (result) => {
            if (result.isConfirmed && result.value.trim() !== '') {
                const reason = result.value.trim();

                try {
                    const response = await fetch('/admin/return-reject', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ orderId, itemId, action, reason })
                    });

                    const resultData = await response.json();

                    if (resultData.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success!',
                            text: resultData.message,
                            confirmButtonColor: '#5e5ce6'
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: resultData.message,
                            confirmButtonColor: '#ff3b30'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Network Error',
                        text: 'Could not process the return request.',
                        confirmButtonColor: '#ff3b30'
                    });
                }
            } else if (result.isConfirmed && result.value.trim() === '') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Reason Required',
                    text: 'Please provide a reason for rejection.',
                    confirmButtonColor: '#ff9500'
                });
            }
        });
    });
});


   
    