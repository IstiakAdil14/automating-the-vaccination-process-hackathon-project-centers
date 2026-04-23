import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CenterApplication } from "@/lib/db/models/CenterApplication";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

function generateRef(): string {
  return `VCBD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function sendConfirmationEmail(email: string, name: string, ref: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transporter.sendMail({
    from: `"VaccinationBD" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Center Registration Received — VaccinationBD",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0d9488">Registration Received</h2>
        <p>Dear ${name},</p>
        <p>Your vaccination center registration has been submitted successfully.</p>
        <p><strong>Reference Number:</strong> <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px">${ref}</code></p>
        <p>Our team will review your application within <strong>48 hours</strong>. You will receive an email once the review is complete.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#64748b;font-size:13px">VaccinationBD — Government of Bangladesh</p>
      </div>
    `,
  });
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const upazila = body.upazila || body.localBodyName || "";
    const ref = generateRef();

    const doc = await CenterApplication.create({
      referenceNumber:    ref,
      centerName:         body.centerName,
      licenseNumber:      body.licenseNumber,
      centerType:         body.centerType,
      establishedYear:    body.establishedYear,
      division:           body.division,
      district:           body.district,
      localBodyType:      body.localBodyType,
      upazila,
      address:            body.address,
      geoLat:             body.geoLat ?? null,
      geoLng:             body.geoLng ?? null,
      contactName:        body.contactName,
      designation:        body.designation,
      phone:              body.phone,
      email:              body.email,
      schedule:           body.schedule,
      facilityLicenseUrl: body.facilityLicenseUrl,
      centerPhotoUrl:     body.centerPhotoUrl,
      officerNidUrl:      body.officerNidUrl,
      capacity:           body.capacity,
      vaccines:           body.vaccines,
      status:             "pending_review",
    });

    // Write hashedPassword via raw collection to bypass any schema-level stripping
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 12);
      await CenterApplication.collection.updateOne(
        { _id: doc._id },
        { $set: { hashedPassword } }
      );
    }

    try {
      await sendConfirmationEmail(body.email, body.contactName, ref);
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ referenceNumber: ref }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
