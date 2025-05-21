document.addEventListener("DOMContentLoaded", () => {
  const togglePassword = document.getElementById("togglePassword");
  const password = document.getElementById("password");
  const loginForm = document.getElementById("loginForm");
  const email = document.getElementById("email");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  // Password visibility toggle
  togglePassword.addEventListener("click", function () {
    const type = password.getAttribute("type") === "password" ? "text" : "password";
    password.setAttribute("type", type);
    this.querySelector("i").classList.toggle("fa-eye");
    this.querySelector("i").classList.toggle("fa-eye-slash");
  });

  // Function to clear error messages
  const clearErrors = () => {
    emailError.style.display = "none";
    emailError.textContent = "";
    passwordError.style.display = "none";
    passwordError.textContent = "";
  };

  // Real-time validation on input
  email.addEventListener("input", () => {
    if (email.value.trim()) {
      emailError.style.display = "none";
      emailError.textContent = "";
    }
  });

  password.addEventListener("input", () => {
    if (password.value.trim()) {
      passwordError.style.display = "none";
      passwordError.textContent = "";
    }
  });

  // Form submission with validation
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission

    const emailValue = email.value.trim();
    const passwordValue = password.value.trim();
    let hasError = false;

    // Clear previous error messages
    clearErrors();

    // Validation for empty fields
    if (!emailValue) {
      emailError.textContent = "Please enter your email address.";
      emailError.style.display = "block";
      hasError = true;
    }
    if (!passwordValue) {
      passwordError.textContent = "Please enter your password.";
      passwordError.style.display = "block";
      hasError = true;
    }

    if (hasError) {
      return; // Stop if there are validation errors
    }

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success: Show success alert and redirect
        Swal.fire({
          icon: "success",
          title: "Login Successful!",
          text: "Welcome back to Noor Fragrances!",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "/"; // Redirect to dashboard or home
        });
      } else {
        // Error: Show error message from server
        Swal.fire({
          icon: "error",
          title: "Login Failed",
          text: data.message || "Invalid email or password",
        });
      }
    } catch (error) {
      // Network or unexpected error
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Something went wrong. Please try again later.",
      });
    }
  });
});