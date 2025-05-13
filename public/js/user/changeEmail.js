
document.getElementById('changeEmailForm').addEventListener('submit', async function (e) {
e.preventDefault();

const newEmail = document.getElementById('newEmail').value;
const password = document.getElementById('password').value;

// Email and password regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;

// Validate email
if (!emailRegex.test(newEmail)) {
Swal.fire({ icon: 'warning', title: 'Invalid Email', text: 'Please enter a valid email address.' });
return;
}

// Validate password
if (!passwordRegex.test(password)) {
Swal.fire({ 
  icon: 'warning', 
  title: 'Weak Password', 
  text: 'Password must be at least 8 characters long and contain both letters and numbers.' 
});
return;
}

Swal.fire({ title: 'Confirmation Message Sent to New Email...', didOpen: () => Swal.showLoading() });

try {
const response = await fetch('/change-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ newEmail, password }),
});

const result = await response.json();
Swal.close();

// Handle success or failure based on result
if (result.success) {
  const email = result.newEmail
  window.location.href = `/email-sent-confirmation?email=${email}`; // Redirects to a new page on the same domain

}else{
  Swal.fire({ icon: 'error', title: 'Error', text: result.message });

}

} catch (error) {
Swal.close();
console.error('Error:', error);
Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred. Please try again.' });
}
});

