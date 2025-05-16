

        
        const fromDateInput = document.querySelector("input[name='dateFrom']");
const toDateInput = document.querySelector("input[name='dateTo']");

const fromDatePicker = flatpickr(fromDateInput, {
    dateFormat: "d/m/Y",
    allowInput: true,
    onChange: function(selectedDates, dateStr, instance) {
        if (selectedDates[0]) {
            toDatePicker.set("minDate", selectedDates[0]);
        }
    }
});

const toDatePicker = flatpickr(toDateInput, {
    dateFormat: "d/m/Y",
    allowInput: true,
    onChange: function(selectedDates, dateStr, instance) {
        if (selectedDates[0]) {
            fromDatePicker.set("maxDate", selectedDates[0]);
        }
    }
});


        async function toggleCoupon(couponId, shouldList) {
            const action = shouldList ? 'List' : 'Unlist';

            const result = await Swal.fire({
                title: `${action} this coupon?`,
                text: `Are you sure you want to ${action.toLowerCase()} this coupon?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: `Yes, ${action}`,
                cancelButtonText: 'Cancel'
            });

            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/listOrUnlist/${couponId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ isListed: shouldList })
                    });

                    if (response.ok) {
                        Swal.fire('Success', `Coupon has been ${action.toLowerCase()}ed.`, 'success').then(() => {
                            location.reload();
                        });
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Failed to update coupon.');
                    }
                } catch (err) {
                    Swal.fire('Error', err.message || 'Something went wrong.', 'error');
                }
            }
        }

        function clearSearch() {
            document.getElementById('searchInput').value = '';
            document.getElementById('sortBy').value = 'newest';
            document.querySelector('input[name="dateFrom"]').value = '';
            document.querySelector('input[name="dateTo"]').value = '';
            window.location.href = '/admin/coupons';
        }

        function confirmAndDelete(id) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'This will delete the coupon!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/admin/deleteCoupon?id=${id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire('Deleted!', data.message, 'success').then(() => {
                                location.reload(); 
                            });
                        } else {
                            Swal.fire('Error!', data.message, 'error');
                        }
                    })
                    .catch(error => {
                        console.error(error);
                        Swal.fire('Error!', 'Something went wrong while deleting.', 'error');
                    });
                }
            });
            return false; 
        }

        // Add automatic form submission when sort option changes
        document.getElementById('sortBy').addEventListener('change', function() {
            document.querySelector('form').submit();
        });
    