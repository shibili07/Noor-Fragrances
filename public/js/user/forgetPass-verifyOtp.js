
(function() {
  const OTP_LENGTH = 6;
  const TIMER_DURATION = 60;
  let timer = TIMER_DURATION;
  let timerInterval;

  const otpInput = document.getElementById("otp");
  const timerDisplay = document.getElementById("timerValue");
  const resendBtn = document.getElementById("resendBtn");

  function startTimer() {
    timer = TIMER_DURATION;
    timerDisplay.textContent = timer;
    otpInput.disabled = false;
    resendBtn.disabled = true;

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      timer--;
      timerDisplay.textContent = timer;

      if (timer <= 0) {
        clearInterval(timerInterval);
        timerDisplay.textContent = "00";
        otpInput.disabled = true;
        resendBtn.disabled = false;
      }
    }, 1000);
  }

  function validateOTPForm() {
    const otpValue = otpInput.value.trim();
    Swal.fire({ title: 'Verifying OTP...', didOpen: () => Swal.showLoading() });

    $.ajax({
      type: "POST",
      url: "/forgotPasswordOtpVerify",
      data: { otp: otpValue },
      success: function(response) {
        Swal.close();
        if (response.success) {
          Swal.fire({
            icon: "success",
            title: "OTP Verified Successfully",
            showConfirmButton: false,
            timer: 1500,
          }).then(() => {
            window.location.href = response.redirectUrl;
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: response.message || "Invalid OTP",
          });
        }
      },
      error: function() {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "Invalid OTP",
          text: "Please try again",
        });
      }
    });
    return false; // Prevent form submission
  }

  function resendOTP() {
    resendBtn.disabled = true;
    startTimer(); // Restart timer immediately

    Swal.fire({ title: 'Sending OTP...', didOpen: () => Swal.showLoading() });

    $.ajax({
      type: "POST",
      url: "/resendOtpForgotPass",
      success: function(response) {
        Swal.close();
        if (response.success) {
          Swal.fire({
            icon: "success",
            title: "OTP Resent Successfully",
            showConfirmButton: false,
            timer: 1500,
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: response.message || "Failed to resend OTP",
          });
          clearInterval(timerInterval);
          timerDisplay.textContent = "00";
          otpInput.disabled = true;
          resendBtn.disabled = false;
        }
      },
      error: function() {
        Swal.close();
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Network error. Please try again",
        });
        clearInterval(timerInterval);
        timerDisplay.textContent = "00";
        otpInput.disabled = true;
        resendBtn.disabled = false;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    otpInput.focus();
    startTimer();

    otpInput.addEventListener('input', function() {
      this.value = this.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    });

    otpInput.addEventListener('paste', function(e) {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
      this.value = pasted.slice(0, OTP_LENGTH);
    });
  });

  // Expose functions for inline onclick
  window.validateOTPForm = validateOTPForm;
  window.resendOTP = resendOTP;
})();
