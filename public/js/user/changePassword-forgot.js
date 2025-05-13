
    function togglePassword(fieldId) {
      const field = document.getElementById(fieldId);
      const icon = field.nextElementSibling.querySelector('i');
      if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    }

    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");
    const passwordResetForm = document.getElementById("passwordResetForm");
    const error4 = document.getElementById("error4");
    const error5 = document.getElementById("error5");

    function validatePasswords() {
      const passval = password.value.trim();
      const cpassval = confirmPassword.value.trim();
      const alpha = /[a-zA-Z]/;
      const digit = /\d/;
      const spaces = /\s/;
      let isValid = true;

      error4.style.display = "none";
      error5.style.display = "none";

      if (passval.length < 6) {
        error4.style.display = "block";
        error4.textContent = "Password must be at least 6 characters long.";
        isValid = false;
      } else if (!alpha.test(passval)) {
        error4.style.display = "block";
        error4.textContent = "Password must contain at least one letter.";
        isValid = false;
      } else if (!digit.test(passval)) {
        error4.style.display = "block";
        error4.textContent = "Password must contain at least one number.";
        isValid = false;
      } else if (spaces.test(passval)) {
        error4.style.display = "block";
        error4.textContent = "Password cannot contain spaces.";
        isValid = false;
      }

      if (passval !== cpassval) {
        error5.style.display = "block";
        error5.textContent = "Passwords do not match.";
        isValid = false;
      }

      return isValid;
    }

    passwordResetForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!validatePasswords()) return;

      Swal.fire({ title: 'Saving new password...', didOpen: () => Swal.showLoading() });

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
    password.addEventListener('input', validatePasswords);
    confirmPassword.addEventListener('input', validatePasswords);

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('password').focus();
    });
  