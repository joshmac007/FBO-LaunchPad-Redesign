"use server"

import nodemailer from "nodemailer"

interface DemoRequestData {
  name: string
  fboName: string
  email: string
  message: string
}

export async function sendDemoRequestEmail(data: DemoRequestData) {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER || "smtp.outlook.com",
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || "your-email@outlook.com", // fallback is just for development
        pass: process.env.EMAIL_PASSWORD || "your-password", // fallback is just for development
      },
    })

    // Email recipients
    const recipients = ["tyler.r.fbo@outlook.com", "josh.m.fbo@outlook.com"]

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@fbolaunchpad.com",
      to: recipients.join(", "),
      subject: `New Demo Request from ${data.name} at ${data.fboName}`,
      html: `
        <h1>New Demo Request</h1>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>FBO Name:</strong> ${data.fboName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, "<br>")}</p>
      `,
      text: `
        New Demo Request
        
        Name: ${data.name}
        FBO Name: ${data.fboName}
        Email: ${data.email}
        
        Message:
        ${data.message}
      `,
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions)

    // Also store in localStorage for admin dashboard
    // This is handled in the client component

    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: (error as Error).message }
  }
}
