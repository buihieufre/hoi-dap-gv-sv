import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Email service using nodemailer
 * Configure SMTP settings via environment variables:
 * - SMTP_HOST: SMTP server host (e.g., smtp.gmail.com)
 * - SMTP_PORT: SMTP server port (e.g., 587)
 * - SMTP_USER: SMTP username/email
 * - SMTP_PASS: SMTP password/app password
 * - SMTP_FROM: From email address (defaults to SMTP_USER)
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP configuration missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables."
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  /**
   * Send an email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const from = process.env.SMTP_FROM || process.env.SMTP_USER;

      await transporter.sendMail({
        from: `"Hệ thống Q&A" <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`[Email] ✓ Email sent to ${options.to}`);
    } catch (error) {
      console.error(`[Email] ✗ Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }

  /**
   * Send password email to new user
   */
  async sendPasswordEmail(
    email: string,
    fullName: string,
    password: string
  ): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4f46e5;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .password-box {
              background-color: #fff;
              border: 2px solid #4f46e5;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              color: #4f46e5;
              font-family: monospace;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Chào mừng đến với Hệ thống Q&A</h1>
          </div>
          <div class="content">
            <p>Xin chào <strong>${fullName}</strong>,</p>
            <p>Tài khoản của bạn đã được tạo thành công trong hệ thống Q&A.</p>
            <p>Thông tin đăng nhập của bạn:</p>
            <div class="password-box">
              Mật khẩu: ${password}
            </div>
            <div class="warning">
              <strong>⚠️ Lưu ý:</strong> Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu để bảo mật tài khoản của bạn.
            </div>
            <p>Bạn có thể đăng nhập bằng email: <strong>${email}</strong></p>
            <p>Trân trọng,<br>Đội ngũ Hệ thống Q&A</p>
          </div>
          <div class="footer">
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: "Thông tin đăng nhập - Hệ thống Q&A",
      html,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

