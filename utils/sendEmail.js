const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.NODEMAILER_EMAIL, // Gmail email address
        pass: process.env.NODEMAILER_PASSWORD, // App password if using 2FA
      },
    });

    // Verify SMTP configuration
    await transporter.verify();
    console.log('SMTP server is ready to accept messages');

    // Send email
    const info = await transporter.sendMail({
      from: `"Your App" <${process.env.NODEMAILER_EMAIL}>`,
      to,
      subject,
      html,
    });
    
    
    console.log('Message sent: %s', info.messageId);
  } catch (err) {
    console.error('Error occurred while sending email:', err);
    throw new Error('Failed to send email: ' + err.message);
  }
};

module.exports = sendEmail;
