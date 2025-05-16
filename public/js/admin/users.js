
        function clearSearch() {
            document.getElementById('searchInput').value = '';
            document.getElementById('searchBtn').click();
        }

        async function blockUser(userId, userName) {
            const result = await Swal.fire({
                title: 'Block User',
                text: `Are you sure you want to block ${userName}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff3b30',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, block user'
            });


            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/blockCustomer/${userId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                    });

                    if (response.ok) {
                        Swal.fire({
                            title: 'Blocked!',
                            text: `${userName} has been blocked successfully`,
                            icon: 'success',
                            confirmButtonColor: '#5e5ce6'
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        throw new Error('Failed to block user');
                    }
                } catch (error) {
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to block user. Please try again.',
                        icon: 'error',
                        confirmButtonColor: '#5e5ce6'
                    });
                }
            }
        }

        async function unblockUser(userId, userName) {
            const result = await Swal.fire({
                title: 'Unblock User',
                text: `Are you sure you want to unblock ${userName}?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#34c759',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Yes, unblock user'
            });

            if (result.isConfirmed) {
                try {
                    const response = await fetch(`/admin/unblockCustomer/${userId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                    });

                    if (response.ok) {
                        Swal.fire({
                            title: 'Unblocked!',
                            text: `${userName} has been unblocked successfully`,
                            icon: 'success',
                            confirmButtonColor: '#5e5ce6'
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        throw new Error('Failed to unblock user');
                    }
                } catch (error) {
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to unblock user. Please try again.',
                        icon: 'error',
                        confirmButtonColor: '#5e5ce6'
                    });
                }
            }
        }
    