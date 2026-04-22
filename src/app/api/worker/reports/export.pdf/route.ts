// GET /api/worker/reports/export.pdf?from=&to=&type=vaccinations|staff|sideeffects
// Server-side PDF: generates an HTML report and returns it as text/html with
// a print-ready stylesheet. The browser's native print-to-PDF is triggered
// client-side via window.print() on a dedicated print page.
// For a true server-side binary PDF, swap the body below with a puppeteer/wkhtmltopdf call.
import { NextRequest, NextResponse } from "next/server";
import { requireManagerApiSession } from "@/lib/auth/getServerSession";
import { connectDB, VaccinationRecord, User, Center } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  let session;
  try { session = await requireManagerApiSession(); }
  catch (e) { return e as Response; }

  await connectDB();
  const centerId = new mongoose.Types.ObjectId(session.user.centerId);
  const { searchParams } = new URL(req.url);

  const from  = searchParams.get("from")  ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const to    = searchParams.get("to")    ?? new Date().toISOString().slice(0, 10);
  const type  = searchParams.get("type")  ?? "vaccinations";

  const center = await Center.findById(centerId).select("name address district division").lean();
  const centerName = center?.name ?? "Vaccination Center";

  const fromDate = new Date(from);
  const toDate   = new Date(to + "T23:59:59Z");

  let tableHtml = "";
  let reportTitle = "";

  if (type === "vaccinations") {
    reportTitle = "Vaccination Summary Report";
    const records = await VaccinationRecord.find({
      centerId, pendingSync: false,
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .sort({ createdAt: -1 })
      .limit(500)
      .populate<{ staffId: { name: string } }>("staffId", "name")
      .lean();

    const rows = records.map((r) => `
      <tr>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        <td>${r.vaccineType}</td>
        <td>Dose ${r.doseNumber}</td>
        <td>${r.batchNo}</td>
        <td>${(r.staffId as unknown as { name: string })?.name ?? "—"}</td>
        <td>${r.adverseReaction ? "Yes" : "No"}</td>
      </tr>`).join("");

    tableHtml = `
      <table>
        <thead><tr><th>Date</th><th>Vaccine</th><th>Dose</th><th>Batch</th><th>Staff</th><th>Reaction</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } else if (type === "staff") {
    reportTitle = "Staff Performance Report";
    const staff = await User.find({ centerId, role: { $in: ["staff", "supervisor"] } })
      .select("name role isActive").lean();
    const staffIds = staff.map((s) => s._id);
    const records = await VaccinationRecord.aggregate([
      { $match: { staffId: { $in: staffIds }, centerId, createdAt: { $gte: fromDate, $lte: toDate }, pendingSync: false } },
      { $group: { _id: "$staffId", count: { $sum: 1 } } },
    ]);
    const recMap: Record<string, number> = {};
    for (const r of records) recMap[String(r._id)] = r.count;

    const rows = staff.map((s) => `
      <tr>
        <td>${s.name}</td>
        <td>${s.role === "supervisor" ? "Manager" : "Staff"}</td>
        <td>${s.isActive ? "Active" : "Inactive"}</td>
        <td>${recMap[String(s._id)] ?? 0}</td>
      </tr>`).join("");

    tableHtml = `
      <table>
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Vaccinations</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } else {
    reportTitle = "Side Effect Reports";
    const records = await VaccinationRecord.find({
      centerId, pendingSync: false,
      adverseReaction: { $exists: true, $ne: "" },
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate<{ staffId: { name: string } }>("staffId", "name")
      .lean();

    const rows = records.map((r) => `
      <tr>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        <td>${r.vaccineType}</td>
        <td>Dose ${r.doseNumber}</td>
        <td>${r.adverseReaction}</td>
        <td>${(r.staffId as unknown as { name: string })?.name ?? "—"}</td>
      </tr>`).join("");

    tableHtml = `
      <table>
        <thead><tr><th>Date</th><th>Vaccine</th><th>Dose</th><th>Reaction</th><th>Staff</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${reportTitle} — ${centerName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 11px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #1a3a5c; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 32px; font-size: 10px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print {
    body { padding: 16px; }
    @page { margin: 20mm; }
  }
</style>
</head>
<body>
  <h1>${reportTitle}</h1>
  <div class="meta">
    <strong>${centerName}</strong> &nbsp;·&nbsp; ${center?.address ?? ""}, ${center?.district ?? ""}<br/>
    Period: ${from} to ${to} &nbsp;·&nbsp; Generated: ${new Date().toLocaleString()}
  </div>
  ${tableHtml}
  <div class="footer">VaccinationBD Centers Portal — Official Report — Do not distribute without authorization</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${type}-report-${from}-${to}.html"`,
    },
  });
}
