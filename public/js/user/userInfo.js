 
        // Modal handling
        const modal = document.getElementById("passwordModal");
        const openBtn = document.getElementById("openPasswordModal");
        const closeBtn = document.getElementById("closePasswordModal");
        const passwordForm = document.getElementById("passwordForm");
        const userId = openBtn.dataset.userId;

        // Function to clear form and errors
        const clearForm = () => {
          passwordForm.reset(); // Clear all input fields
          ["currentPassword", "newPassword", "confirmPassword"].forEach(field => {
            document.getElementById(`${field}Error`).innerText = ""; // Clear error messages
            const input = document.getElementById(field);
            input.type = "password"; // Reset to password type
            const toggle = document.querySelector(`.toggle-password[data-target="${field}"]`);
            toggle.classList.remove("fa-eye-slash");
            toggle.classList.add("fa-eye"); // Reset eye icon
          });
        };

        // Open modal
        openBtn.addEventListener("click", () => {
          modal.style.display = "flex";
        });

        // Close modal and clear form
        closeBtn.addEventListener("click", () => {
          modal.style.display = "none";
          clearForm();
        });

        // Close modal on background click and clear form
        window.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.style.display = "none";
            clearForm();
          }
        });

        // Toggle password visibility
        document.querySelectorAll(".toggle-password").forEach((toggle) => {
          toggle.addEventListener("click", () => {
            const targetId = toggle.dataset.target;
            const input = document.getElementById(targetId);
            const isPasswordVisible = input.type === "text";

            input.type = isPasswordVisible ? "password" : "text";
            toggle.classList.toggle("fa-eye", isPasswordVisible);
            toggle.classList.toggle("fa-eye-slash", !isPasswordVisible);
          });
        });

        // Password form submission and validation
        document.getElementById("passwordForm").addEventListener("submit", async function (e) {
          e.preventDefault();

          // Clear previous errors
          ["currentPassword", "newPassword", "confirmPassword"].forEach(field =>
            document.getElementById(`${field}Error`).innerText = ""
          );

          const currentPassword = document.getElementById("currentPassword").value.trim();
          const newPassword = document.getElementById("newPassword").value.trim();
          const confirmPassword = document.getElementById("confirmPassword").value.trim();

          let hasError = false;

          // Validate current password
          if (!currentPassword) {
            document.getElementById("currentPasswordError").innerText = "Current password is required.";
            hasError = true;
          }

          // Validate new password
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;

          if (!newPassword) {
            document.getElementById("newPasswordError").innerText = "New password is required.";
            hasError = true;
          } else if (newPassword.length < 8) {
            document.getElementById("newPasswordError").innerText = "New password must be at least 8 characters.";
            hasError = true;
          } else if (!passwordRegex.test(newPassword)) {
            document.getElementById("newPasswordError").innerText = "Password must include uppercase, lowercase, and a number. No special characters allowed.";
            hasError = true;
          } else if (newPassword === currentPassword) {
            document.getElementById("newPasswordError").innerText = "New password must be different from current password.";
            hasError = true;
          }

          // Validate confirm password
          if (!confirmPassword) {
            document.getElementById("confirmPasswordError").innerText = "Please confirm your new password.";
            hasError = true;
          } else if (confirmPassword !== newPassword) {
            document.getElementById("confirmPasswordError").innerText = "Passwords do not match.";
            hasError = true;
          }

          if (hasError) return;
          try {
            const res = await fetch(`/changePassword/${userId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
              Swal.fire({ icon: "error", title: "Error", text: result.message || "Failed to change password." });
              return;
            }

            Swal.fire({ icon: "success", title: "Success", text: "Password updated successfully!" });
            modal.style.display = "none";
            clearForm(); // Clear form on successful submission
            setTimeout(() => window.location.reload(), 1000);
          } catch (error) {
            Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. Try again later." });
          }
        });
