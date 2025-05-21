function togglePassword(fieldId) {
  const field = document.getElementById(fieldId);
  const icon = field.nextElementSibling.querySelector("i");
  if (field.type === "password") {
    field.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    field.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const passwordResetForm = document.getElementById("passwordResetForm");
const error4 = document.getElementById("error4");
const error5 = document.getElementById("error5");

function passwordValidateChecking() {
  const passval = password.value.trim();
  const cpassval = confirmPassword.value.trim();

  const lowercase = /[a-z]/;
  const uppercase = /[A-Z]/;
  const digit = /\d/;
  const space = /\s/;
  const specialChar = /[^a-zA-Z0-9]/; // Matches any character that is NOT a letter or digit

  let isValid = true;

  // Reset error messages
  error4.style.display = "none";
  error4.innerHTML = "";
  error5.style.display = "none";
  error5.innerHTML = "";

  // Password validation
  if (passval.length === 0) {
    error4.style.display = "block";
    error4.innerHTML = "Password cannot be empty";
    isValid = false;
  } else if (passval.length < 8) {
    error4.style.display = "block";
    error4.innerHTML = "Password must be at least 8 characters long";
    isValid = false;
  } else if (!lowercase.test(passval)) {
    error4.style.display = "block";
    error4.innerHTML = "Password must include at least one lowercase letter";
    isValid = false;
  } else if (!uppercase.test(passval)) {
    error4.style.display = "block";
    error4.innerHTML = "Password must include at least one uppercase letter";
    isValid = false;
  } else if (!digit.test(passval)) {
    error4.style.display = "block";
    error4.innerHTML = "Password must include at least one number";
    isValid = false;
  } else if (space.test(passval)) {
    error4.style.display = "block";
    error4.innerHTML = "Password cannot contain spaces";
    isValid = false;
  } else if (specialChar.test(passval)) {
    error4.style.display = "block";
    error4.innerHTML = "Password must not contain special characters";
    isValid = false;
  }

  // Confirm password validation
  if (cpassval.length === 0) {
    error5.style.display = "block";
    error5.innerHTML = "Confirm password cannot be empty";
    isValid = false;
  } else if (passval !== cpassval) {
    error5.style.display = "block";
    error5.innerHTML = "Passwords do not match";
    isValid = false;
  }

  return isValid;
}

passwordResetForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!passwordValidateChecking()) return;

  Swal.fire({ title: "Saving new password...", didOpen: () => Swal.showLoading() });

  try {
    const response = await fetch("/forgotPassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: password.value.trim(),
        confirmPassword: confirmPassword.value.trim(),
      }),
    });

    const data = await response.json();

    Swal.close();
    if (response.ok) {
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: data.message || "Password changed successfully.",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        window.location.href = "/login";
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: data.message || "Something went wrong. Please try again.",
        confirmButtonColor: "#4CAF50",
        confirmButtonText: "OK",
      });
    }
  } catch (error) {
    Swal.close();
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: "Failed to connect to the server. Please try again.",
      confirmButtonColor: "#4CAF50",
      confirmButtonText: "OK",
    });
  }
});

// Real-time validation on input
password.addEventListener("input", passwordValidateChecking);
confirmPassword.addEventListener("input", passwordValidateChecking);

// Focus on password field when page loads
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("password").focus();
});