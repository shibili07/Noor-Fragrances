my first otp page 

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }
        
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f9f9f9;
            position: relative;
        }
        
        .logo {
            position: absolute;
            top: 20px;
            left: 20px;
            text-align: left;
        }
        
        .logo img {
            max-width: 150px;
            height: auto;
        }
        
        .container {
            width: 100%;
            max-width: 450px;
            text-align: center;
            padding: 20px;
            margin-top: 50px;
        }
        
        h1 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        
        h2 {
            font-size: 24px;
            margin-bottom: 30px;
            color: #333;
        }
        
        .resend {
            color: #b49a6a;
            margin-bottom: 30px;
            font-size: 16px;
        }
        
        .verification-label {
            text-align: left;
            margin-bottom: 10px;
            color: #333;
            font-weight: normal;
        }
        
        .otp-input {
            width: 100%;
            height: 50px;
            border: 1px solid #ccc;
            border-radius: 4px;
            text-align: left;
            font-size: 20px;
            padding: 0 15px;
            margin-bottom: 20px;
            outline: none;
        }
        
        .otp-input:focus {
            border-color: #b49a6a;
        }
        
        .help-text {
            margin-bottom: 30px;
            color: #333;
            font-size: 16px;
            text-align: left;
        }
        
        .help-link {
            color: #b49a6a;
            text-decoration: none;
            cursor: pointer;
        }
        
        .verify-btn {
            width: 100%;
            padding: 15px;
            background-color: #b49a6a;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        
        .verify-btn:hover {
            background-color: #a08a5e;
        }
        
        /* Responsive styles */
        @media screen and (max-width: 480px) {
            .container {
                padding: 15px;
            }
            
            h1 {
                font-size: 24px;
            }
            
            h2 {
                font-size: 20px;
                margin-bottom: 25px;
            }
            
            .otp-input {
                height: 45px;
                font-size: 18px;
            }
            
            .resend, .help-text {
                font-size: 14px;
            }
            
            .logo img {
                max-width: 120px;
            }
        }
    </style>
</head>
<body>
    <div class="logo">
        <img src="/img/logo/image.png" alt="NR NOOR FRAGRANCE">
    </div>
    
    <div class="container">
        <h1>OTP</h1>
        <h2>Verification Code</h2>
        
        <div class="resend">did in : 57sec</div>
        
        <form id="otpForm" method="POST" action="/verify-otp">
            <div class="verification-label">Verification Code</div>
            <input type="text" id="otpInput" class="otp-input" maxlength="6" autocomplete="off" inputmode="numeric" pattern="[0-9]*" name="otp" required>
            
            <div class="help-text">
                Didn't get the code? <button class="help-link">Resent otp</button>
            </div>
            
            <button type="submit" class="verify-btn">Verify OTP</button>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        // Timer functionality
        let seconds = 57;
        const timerElement = document.querySelector('.resend');
        
        const countdown = setInterval(() => {
            seconds--;
            timerElement.textContent = `Resend OTP in : ${seconds}sec`;
            
            if (seconds <= 0) {
                clearInterval(countdown);
                timerElement.textContent = 'Resend OTP';
                timerElement.style.cursor = 'pointer';
                timerElement.addEventListener('click', () => {
                    // Here you would typically call a function to resend OTP
                    // For now, just reset the timer
                    seconds = 60;
                    timerElement.textContent = `Resend OTP in : ${seconds}sec`;
                    const newCountdown = setInterval(() => {
                        seconds--;
                        timerElement.textContent = `Resend OTP in : ${seconds}sec`;
                        
                        if (seconds <= 0) {
                            clearInterval(newCountdown);
                            timerElement.textContent = 'Resend OTP';
                        }

                        $.ajax({
                            type:"POST",
                            url:"/resent-otp",
                            success :function(response){
                                if(response.success){
                                    Swal.fire({
                                        icon:"success",
                                        title:"OTP Resend Successfully",
                                        showConfirmButton:false,
                                        timer:1500,
                                    })

                                }else{
                                    Swal.fire({
                                        icon:"error",
                                        title:"Error",
                                        text:"An error occured while resending OTP. Please try again",


                                    })
                                }
                            }
                        })
                        return false

                    }, 1000);
                });
            }
        }, 1000);

        // Form submission handler
        document.getElementById('otpForm').addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            
            // Get OTP input value
            const otpInput = document.getElementById('otpInput').value;
            
            // Validate OTP input (basic check)
            if (otpInput.length !== 6 || !/^\d+$/.test(otpInput)) {
                Swal.fire({
                    icon: 'error',
                    title: 'Invalid OTP',
                    text: 'Please enter a 6-digit OTP'
                });
                return;
            }

            // AJAX request to verify OTP
            $.ajax({
                type: "POST",
                url: "/verify-otp", // Make sure this matches your backend route
                data: { otp: otpInput },
                success: function(response) {
                    if (response.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'OTP Verified Successfully',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            // Redirect to signup page on successful verification
                            window.location.href = '/home';
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Verification Failed',
                            text: response.message || 'Invalid OTP'
                        });
                    }
                },
                error: function(xhr, status, error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Unable to verify OTP. Please try again.'
                    });
                }
            });
        });
    </script>
</body>
</html>

------------------------------------------------------------------------------------------