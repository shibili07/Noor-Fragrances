
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format validation

    if (!email) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Please enter your email address.',
            confirmButtonColor: '#4A90E2',
            confirmButtonText: 'OK',
        }); 
        return;
    }

    if (!emailRegex.test(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Please enter a valid email address.',
            confirmButtonColor: '#4A90E2',
            confirmButtonText: 'OK',
        });
        return;
    }


    Swal.fire({ title: 'Sending reset instructions...', didOpen: () => Swal.showLoading() });

    try {
        const response = await fetch('/verifyEmail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();

        Swal.close();
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message || 'Password reset instructions have been sent to your email.',
                showConfirmButton: false,
                timer: 1500,
            }).then(() => {
                window.location.href = '/forgotPasswordOtpVerify';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error!',
                text: result.message || 'Something went wrong. Please try again.',
                confirmButtonColor: '#4A90E2',
                confirmButtonText: 'OK',
            });
        }
    } catch (error) {
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Failed to connect to the server. Please check your connection and try again.',
            confirmButtonColor: '#4A90E2',
            confirmButtonText: 'OK',
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('email').focus();
});