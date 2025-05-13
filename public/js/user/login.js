
      document.addEventListener("DOMContentLoaded", () => {
        const togglePassword = document.getElementById("togglePassword");
        const password = document.getElementById("password");
        const loginForm = document.getElementById("loginForm");
        
        // Password visibility toggle
        togglePassword.addEventListener("click", function() {
          const type = password.getAttribute("type") === "password" ? "text" : "password";
          password.setAttribute("type", type);
          this.querySelector("i").classList.toggle("fa-eye");
          this.querySelector("i").classList.toggle("fa-eye-slash");
        });

        // Form submission with Fetch and SweetAlert2
        loginForm.addEventListener("submit", async (e) => {
          e.preventDefault(); // Prevent default form submission

          const email = document.getElementById("email").value;
          const password = document.getElementById("password").value;

          try {
            const response = await fetch("/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
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
   