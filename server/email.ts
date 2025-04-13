import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY is not set');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendVerificationCodeOptions {
  to: string;
  code: string;
}

/**
 * Sends a verification code to the user's email
 */
export async function sendVerificationCode({ to, code }: SendVerificationCodeOptions): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('Cannot send email: SENDGRID_API_KEY is not set');
    return false;
  }

  try {
    const msg = {
      to,
      from: 'noreply@serrasoft.io',
      subject: 'Verifiera din e-postadress till BRF Docenten',
      text: `Hej,\n\nDin verifieringskod är: ${code}\n\nVänliga hälsningar,\nBRF Docenten`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00366D;">Verifiera din e-postadress</h2>
          <p>Hej,</p>
          <p>Tack för att du registrerar dig i BRF Docentens app. För att slutföra registreringen behöver du verifiera din e-postadress.</p>
          <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <p style="font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 5px;">${code}</p>
          </div>
          <p>Ange denna kod i appen för att verifiera ditt konto.</p>
          <p>Vänliga hälsningar,<br>BRF Docenten</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
}