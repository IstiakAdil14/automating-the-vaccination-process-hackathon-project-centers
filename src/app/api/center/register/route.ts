import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { CenterApplication } from "@/lib/db/models/CenterApplication";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

function generateRef(): string {
  return `VCBD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// Shared Center model (same collection the admin reads from)
const CenterSchema = new mongoose.Schema({}, { strict: false, collection: "centers", timestamps: true });
const SharedCenter = mongoose.models.Center ?? mongoose.model("Center", CenterSchema);

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

    // Normalize localBodyName → upazila (from auth/register flow)
    const upazila = body.upazila || body.localBodyName || "";

    const ref = generateRef();

    // 1. Save to center_applications (audit trail)
    await CenterApplication.create({ ...body, upazila, referenceNumber: ref, status: "pending_review" });

    // 2. Save to centers collection in the format the admin expects
    await SharedCenter.create({
      centerId:      ref,
      name:          body.centerName,
      licenseNo:     body.licenseNumber,
      type:          "GOVT_HOSPITAL",
      geoLat:        body.geoLat ?? 0,
      geoLng:        body.geoLng ?? 0,
      address: {
        division: body.division,
        district: body.district,
        upazila,
        full:     body.address,
      },
      contact: {
        name:  body.contactName,
        phone: body.phone,
        email: body.email,
      },
      status:        "PENDING",
      dailyCapacity: body.capacity ?? 100,
      // store extra fields loosely
      localBodyType:       body.localBodyType,
      facilityLicenseUrl:  body.facilityLicenseUrl,
      centerPhotoUrl:      body.centerPhotoUrl,
      officerNidUrl:       body.officerNidUrl,
      referenceNumber:     ref,
    });

    try {
      await sendConfirmationEmail(body.email, body.contactName, ref);
    } catch {
      // Non-fatal
    }

    return NextResponse.json({ referenceNumber: ref }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
