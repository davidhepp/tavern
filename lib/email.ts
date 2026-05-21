type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function emailLinkTemplate({
  title,
  body,
  buttonLabel,
  url,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  url: string;
}) {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  const safeButtonLabel = escapeHtml(buttonLabel);
  const safeUrl = escapeHtml(url);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#09090b;color:#fafafa;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;border:1px solid #27272a;border-radius:12px;background:#18181b;padding:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;">${safeTitle}</h1>
                <p style="margin:0 0 24px;color:#d4d4d8;font-size:15px;line-height:1.6;">${safeBody}</p>
                <a href="${safeUrl}" style="display:inline-block;border-radius:8px;background:#fafafa;color:#18181b;padding:10px 14px;text-decoration:none;font-size:14px;font-weight:700;">${safeButtonLabel}</a>
                <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.5;">If the button does not work, open this link:<br><a href="${safeUrl}" style="color:#fafafa;">${safeUrl}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "Email not sent. Set RESEND_API_KEY and EMAIL_FROM to enable transactional email.",
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${error}`);
  }
}

export function sendEmailInBackground(input: SendEmailInput) {
  void sendEmail(input).catch((error) => {
    console.error(error);
  });
}
