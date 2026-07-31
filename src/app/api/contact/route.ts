import { NextResponse } from "next/server";

import { BRAND_NAME } from "@/lib/brand";

type ContactBody = {
  name?: string;
  email?: string;
  package?: string;
  message?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  const body = await request.json() as ContactBody;
  const name = body.name?.trim();
  const email = body.email?.trim();
  const selectedPackage = body.package?.trim();
  const message = body.message?.trim();

  if (!name || !email || !selectedPackage || !message) {
    return NextResponse.json({ error: "Please complete every field." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const contactEmail = process.env.CONTACT_EMAIL;
  const configuredFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !contactEmail || !configuredFromEmail) {
    return NextResponse.json(
      { error: "Email delivery is not configured yet. Please contact the site administrator." },
      { status: 503 },
    );
  }

  // Public inbox providers such as Gmail cannot be used as a Resend sender
  // domain. Keep the configured inbox as the recipient and use Resend's
  // testing sender until a custom domain is verified.
  const fromEmail = /@(gmail|yahoo|outlook|hotmail)\./i.test(configuredFromEmail)
    ? `${BRAND_NAME} <onboarding@resend.dev>`
    : configuredFromEmail.includes("<")
      ? configuredFromEmail
      : `${BRAND_NAME} <${configuredFromEmail}>`;

  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    package: escapeHtml(selectedPackage),
    message: escapeHtml(message).replace(/\n/g, "<br />"),
  };

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
      from: fromEmail,
      to: [contactEmail],
      reply_to: email,
      subject: `New ${BRAND_NAME} enquiry from ${name}`,
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;background:#050706;font-family:Arial,sans-serif;color:#f5f7f5">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050706;padding:42px 14px">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:linear-gradient(145deg,#151916,#0d100e);border:1px solid #23472f;border-radius:24px;overflow:hidden">
                  <tr><td style="height:6px;background:linear-gradient(90deg,#16ab55,#ffbd00)"></td></tr>
                  <tr><td style="padding:38px 42px 18px">
                    <div style="font-size:25px;font-weight:800">NEX-GEN <span style="color:#16ab55">POWER</span></div>
                    <div style="margin-top:34px;color:#16ab55;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase">New website enquiry</div>
                    <h1 style="margin:12px 0 10px;font-size:31px;line-height:1.2">A new connection is <span style="color:#ffbd00">growing.</span></h1>
                    <p style="margin:0;color:#9da39f;line-height:1.7">Someone has contacted NEX-GEN POWER through the public website.</p>
                  </td></tr>
                  <tr><td style="padding:20px 42px 38px">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d0b;border:1px solid #202823;border-radius:16px">
                      <tr><td style="padding:22px;border-bottom:1px solid #202823"><div style="color:#7b837e;font-size:11px;text-transform:uppercase;letter-spacing:2px">Name</div><div style="margin-top:6px;font-size:17px;font-weight:700">${safe.name}</div></td></tr>
                      <tr><td style="padding:22px;border-bottom:1px solid #202823"><div style="color:#7b837e;font-size:11px;text-transform:uppercase;letter-spacing:2px">Email</div><div style="margin-top:6px;color:#50cd7b">${safe.email}</div></td></tr>
                      <tr><td style="padding:22px;border-bottom:1px solid #202823"><div style="color:#7b837e;font-size:11px;text-transform:uppercase;letter-spacing:2px">Interested package</div><div style="margin-top:6px;color:#ffbd00;font-weight:700">${safe.package}</div></td></tr>
                      <tr><td style="padding:22px"><div style="color:#7b837e;font-size:11px;text-transform:uppercase;letter-spacing:2px">Message</div><div style="margin-top:9px;line-height:1.7;color:#d8dcda">${safe.message}</div></td></tr>
                    </table>
                    <p style="margin:24px 0 0;color:#68706b;font-size:12px;text-align:center">Sent securely from the NEX-GEN POWER contact form.</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
        </html>
      `,
      }),
    });
  } catch (error) {
    console.error("Resend network error", error);
    return NextResponse.json(
      { error: "Email service is temporarily unreachable. Please try again." },
      { status: 503 },
    );
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    console.error("Resend contact error", detail);
    return NextResponse.json({ error: "Email could not be delivered. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
