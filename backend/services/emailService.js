const nodemailer = require('nodemailer');

/**
 * Email Service
 * Handles sending email notifications for various events
 */

// Create email transporter
const createTransporter = () => {
  // For development, use ethereal email (test email service)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTestAccount().then(testAccount => {
      return nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    });
  }

  // For production, use real SMTP settings
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

/**
 * Send delivery status update email
 */
const sendDeliveryStatusEmail = async (recipientEmail, deliveryData) => {
  try {
    const transporter = await createTransporter();
    
    const statusMessages = {
      'pending': 'Your delivery has been scheduled and is waiting for pickup',
      'picked': 'Your food has been picked up by the volunteer',
      'in_transit': 'Your food is currently in transit to the destination',
      'delivered': 'Your food has been successfully delivered!'
    };

    const statusColors = {
      'pending': '#FFA500',
      'picked': '#1E90FF', 
      'in_transit': '#9370DB',
      'delivered': '#32CD32'
    };

    const message = statusMessages[deliveryData.status] || 'Delivery status updated';
    const color = statusColors[deliveryData.status] || '#808080';

    const mailOptions = {
      from: `"FoodRoute+ Platform" <${process.env.EMAIL_FROM || 'noreply@foodroute.com'}>`,
      to: recipientEmail,
      subject: `Delivery Update: ${deliveryData.status.charAt(0).toUpperCase() + deliveryData.status.slice(1)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Delivery Status Update</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #4CAF50;
            }
            .header h1 {
              color: #4CAF50;
              margin: 0;
              font-size: 28px;
            }
            .status-badge {
              display: inline-block;
              padding: 10px 20px;
              background-color: ${color};
              color: white;
              border-radius: 20px;
              font-weight: bold;
              margin: 20px 0;
              text-transform: uppercase;
            }
            .delivery-info {
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .delivery-info h3 {
              margin-top: 0;
              color: #333;
            }
            .info-item {
              margin: 10px 0;
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            .info-item:last-child {
              border-bottom: none;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ FoodRoute+</h1>
              <h2>Delivery Status Update</h2>
            </div>
            
            <div class="status-badge">
              ${deliveryData.status.charAt(0).toUpperCase() + deliveryData.status.slice(1)}
            </div>
            
            <p>${message}</p>
            
            <div class="delivery-info">
              <h3>Delivery Details</h3>
              <div class="info-item">
                <strong>Food Item:</strong> ${deliveryData.foodName || 'N/A'}
              </div>
              <div class="info-item">
                <strong>Quantity:</strong> ${deliveryData.quantity || 'N/A'} meals
              </div>
              <div class="info-item">
                <strong>Volunteer:</strong> ${deliveryData.volunteerName || 'Assigned'}
              </div>
              <div class="info-item">
                <strong>Estimated Arrival:</strong> ${deliveryData.eta || 'Calculating...'}
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/track-delivery/${deliveryData.deliveryId}" class="cta-button">
                Track Delivery
              </a>
            </div>
            
            <div class="footer">
              <p>Thank you for using FoodRoute+ to reduce food waste! 🌱</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email sent successfully:', info.messageId);
    
    // For development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw new Error('Failed to send email notification');
  }
};

/**
 * Send food listing notification to nearby receivers
 */
const sendFoodListingNotification = async (receivers, foodListing) => {
  try {
    const transporter = await createTransporter();
    
    for (const receiver of receivers) {
      const mailOptions = {
        from: `"FoodRoute+ Platform" <${process.env.EMAIL_FROM || 'noreply@foodroute.com'}>`,
        to: receiver.email,
        subject: `New Food Available: ${foodListing.foodName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Food Available</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
              }
              .container {
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0,0,0,0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #4CAF50;
              }
              .header h1 {
                color: #4CAF50;
                margin: 0;
                font-size: 28px;
              }
              .food-info {
                background-color: #f9f9f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .urgency-high {
                background-color: #ffebee;
                border-left: 4px solid #f44336;
              }
              .urgency-medium {
                background-color: #fff3e0;
                border-left: 4px solid #ff9800;
              }
              .urgency-low {
                background-color: #e8f5e8;
                border-left: 4px solid #4caf50;
              }
              .cta-button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🍽️ FoodRoute+</h1>
                <h2>New Food Available Near You!</h2>
              </div>
              
              <p>Great news! A new food listing is available near your location.</p>
              
              <div class="food-info urgency-${foodListing.urgency}">
                <h3>${foodListing.foodName}</h3>
                <p><strong>Quantity:</strong> ${foodListing.quantity} meals</p>
                <p><strong>Urgency:</strong> ${foodListing.urgency.toUpperCase()}</p>
                <p><strong>Pickup Location:</strong> ${foodListing.location?.address || 'Address available'}</p>
                <p><strong>Time Cooked:</strong> ${new Date(foodListing.timeCooked).toLocaleString()}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/receiver/dashboard" class="cta-button">
                  View Details & Accept
                </a>
              </div>
              
              <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                Help reduce food waste by accepting this donation! 🌱
              </p>
            </div>
          </body>
          </html>
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log(`📧 Food listing notification sent to: ${receiver.email}`);
    }
    
    return { success: true, notifiedCount: receivers.length };
    
  } catch (error) {
    console.error('❌ Failed to send food listing notifications:', error);
    throw new Error('Failed to send food listing notifications');
  }
};

module.exports = {
  sendDeliveryStatusEmail,
  sendFoodListingNotification
};
