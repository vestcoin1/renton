"use client";

/**
 * Generates downloadable PDFs (tenancy agreement, payment receipt) in the browser.
 * jsPDF is loaded on demand so it never ships in the initial bundle.
 * In production these would be rendered server-side and stored in Supabase Storage.
 */
import type { jsPDF as JsPDF } from "jspdf";
import type { Lease, PaymentInvoice, Property, User } from "@/types";
import { renton_ACCOUNT } from "renton-core/fees";
import { formatDate } from "renton-core/utils";

// Standard PDF fonts can't render "â‚¦", so documents use the NGN code.
const ngn = (n: number) => `NGN ${n.toLocaleString("en-NG")}`;

const BRAND: [number, number, number] = [15, 76, 129];
const EMERALD: [number, number, number] = [16, 185, 129];
const MUTED: [number, number, number] = [100, 116, 139];
const INK: [number, number, number] = [15, 23, 42];

interface DocContext {
  invoice: PaymentInvoice;
  lease: Lease;
  property: Property;
  tenant: User;
  landlord: User;
}

class Writer {
  y = 0;
  readonly w: number;
  readonly h: number;
  readonly m = 56;
  constructor(public doc: JsPDF) {
    this.w = doc.internal.pageSize.getWidth();
    this.h = doc.internal.pageSize.getHeight();
  }
  ensure(space: number) {
    if (this.y + space > this.h - 70) {
      this.doc.addPage();
      this.y = this.m;
    }
  }
  header(title: string, number: string) {
    const d = this.doc;
    d.setFillColor(...BRAND);
    d.rect(0, 0, this.w, 92, "F");
    d.setTextColor(255, 255, 255);
    d.setFont("helvetica", "bold").setFontSize(20).text("renton", this.m, 48);
    d.setFont("helvetica", "normal").setFontSize(9).text("Verified homes, direct from trusted landlords", this.m, 64);
    d.setFont("helvetica", "bold").setFontSize(13).text(title.toUpperCase(), this.w - this.m, 46, { align: "right" });
    d.setFont("helvetica", "normal").setFontSize(9).text(number, this.w - this.m, 62, { align: "right" });
    this.y = 128;
  }
  heading(text: string) {
    this.ensure(40);
    this.doc.setTextColor(...BRAND).setFont("helvetica", "bold").setFontSize(11).text(text.toUpperCase(), this.m, this.y);
    this.y += 8;
    this.doc.setDrawColor(226, 232, 240).setLineWidth(1).line(this.m, this.y, this.w - this.m, this.y);
    this.y += 18;
  }
  para(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) {
    const d = this.doc;
    d.setFont("helvetica", opts.bold ? "bold" : "normal").setFontSize(opts.size ?? 10).setTextColor(...(opts.color ?? INK));
    const lines = d.splitTextToSize(text, this.w - this.m * 2) as string[];
    const lh = (opts.size ?? 10) * 1.45;
    for (const line of lines) {
      this.ensure(lh);
      d.text(line, this.m, this.y);
      this.y += lh;
    }
    this.y += opts.gap ?? 6;
  }
  rows(rows: [string, string][], opts: { boldLast?: boolean } = {}) {
    const d = this.doc;
    rows.forEach(([k, v], i) => {
      this.ensure(22);
      const last = opts.boldLast && i === rows.length - 1;
      d.setFont("helvetica", last ? "bold" : "normal").setFontSize(last ? 11 : 10);
      d.setTextColor(...(last ? INK : MUTED)).text(k, this.m, this.y);
      d.setTextColor(...INK).text(v, this.w - this.m, this.y, { align: "right" });
      this.y += last ? 22 : 18;
      if (opts.boldLast && i === rows.length - 2) {
        d.setDrawColor(203, 213, 225).line(this.m, this.y - 8, this.w - this.m, this.y - 8);
        this.y += 4;
      }
    });
    this.y += 8;
  }
  footer(note: string) {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      d.setPage(i);
      d.setDrawColor(226, 232, 240).line(this.m, this.h - 52, this.w - this.m, this.h - 52);
      d.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
      d.text(note, this.m, this.h - 36);
      d.text(`Page ${i} of ${pages}`, this.w - this.m, this.h - 36, { align: "right" });
    }
  }
}

async function newDoc() {
  const { jsPDF } = await import("jspdf");
  return new jsPDF({ unit: "pt", format: "a4" });
}

/** Street address + area + city, without repeating the area when the street already names it. */
const fullAddress = (p: Property) => [p.address, p.address.includes(p.area) ? null : p.area, p.city].filter(Boolean).join(", ");

const fileSafe = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "");

export async function buildPaymentReceipt({ invoice, property, tenant }: Omit<DocContext, "lease" | "landlord"> & { lease?: Lease; landlord?: User }) {
  const doc = await newDoc();
  const w = new Writer(doc);
  w.header("Payment receipt", invoice.receiptNumber ?? "");

  // PAID stamp
  doc.setDrawColor(...EMERALD).setLineWidth(2).roundedRect(w.w - w.m - 110, w.y - 6, 110, 40, 6, 6);
  doc.setTextColor(...EMERALD).setFont("helvetica", "bold").setFontSize(18).text("PAID", w.w - w.m - 55, w.y + 21, { align: "center" });

  w.para(`Receipt no. ${invoice.receiptNumber}`, { bold: true, size: 12, gap: 2 });
  w.para(`Issued ${formatDate(invoice.verifiedAt ?? new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" })}`, { color: MUTED, gap: 18 });

  w.heading("Received from");
  w.rows([
    ["Tenant", tenant.name],
    ["Email", tenant.email],
    ["Phone", tenant.phone],
  ]);

  w.heading("Property");
  w.rows([
    ["Home", property.title],
    ["Address", fullAddress(property)],
  ]);

  w.heading("Payment details");
  w.rows([...invoice.items.map((i) => [i.label, ngn(i.amount)] as [string, string]), ["Total paid", ngn(invoice.total)]], { boldLast: true });

  w.heading("Transaction");
  w.rows([
    ["Payment method", `Bank transfer to ${renton_ACCOUNT.bank}`],
    ["Payment reference", invoice.reference],
    ["Payer's bank", invoice.receipt?.payerBank ?? "-"],
    ["Date paid", invoice.receipt ? formatDate(invoice.receipt.paidOn) : "-"],
    ["Verified by", `${invoice.verifiedBy ?? "renton"} on ${formatDate(invoice.verifiedAt ?? new Date().toISOString())}`],
  ]);

  w.para("The caution deposit is refundable at the end of the tenancy, less the cost of any damage beyond fair wear and tear, as set out in the tenancy agreement.", {
    size: 9,
    color: MUTED,
  });
  w.footer("renton Technologies Ltd Â· hello@renton.ng Â· Demo document generated by the renton prototype.");
  return doc;
}

export async function downloadPaymentReceipt(ctx: Parameters<typeof buildPaymentReceipt>[0]) {
  (await buildPaymentReceipt(ctx)).save(`renton-Receipt-${ctx.invoice.receiptNumber}.pdf`);
}

export async function buildTenancyAgreement({ invoice, lease, property, tenant, landlord }: DocContext) {
  const doc = await newDoc();
  const w = new Writer(doc);
  const years = Math.max(1, Math.round((+new Date(lease.leaseEnd) - +new Date(lease.leaseStart)) / (365.25 * 86400000)));
  const caution = invoice.items.find((i) => i.key === "caution")?.amount ?? 0;
  w.header("Tenancy agreement", invoice.agreementNumber ?? "");

  w.para(`THIS TENANCY AGREEMENT is made on ${formatDate(invoice.verifiedAt ?? new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" })}`, { bold: true, gap: 14 });

  w.heading("Parties");
  w.rows([
    ["Landlord", landlord.name],
    ["Landlord contact", landlord.email],
    ["Tenant", tenant.name],
    ["Tenant contact", `${tenant.email} Â· ${tenant.phone}`],
    ["Managing agent", "renton Technologies Ltd"],
  ]);

  w.heading("The premises");
  w.para(`${lease.unit}, ${property.title}, ${fullAddress(property)}, ${property.state} State. A ${property.bedrooms}-bedroom ${property.type.toLowerCase()} with the fixtures and amenities recorded in the renton inspection report.`);

  w.heading("Term and rent");
  w.rows([
    ["Commencement date", formatDate(lease.leaseStart, { day: "numeric", month: "long", year: "numeric" })],
    ["Expiry date", formatDate(lease.leaseEnd, { day: "numeric", month: "long", year: "numeric" })],
    ["Term", `${years} year${years > 1 ? "s" : ""}`],
    ["Annual rent", ngn(lease.annualRent)],
    ["Caution deposit (refundable)", ngn(caution)],
    ["Rent paid in advance", `Yes Â· receipt ${invoice.receiptNumber}`],
  ]);

  w.heading("Terms");
  const clauses = [
    `Rent. The Tenant has paid rent for the full term in advance through renton. Rent for any renewal is due on or before the expiry date above.`,
    `Caution deposit. The deposit of ${ngn(caution)} is held by renton and refunded within 14 days after the Tenant gives up possession, less the reasonable cost of repairing damage beyond fair wear and tear, as shown by a check-out inspection.`,
    `Use. The premises shall be used as a private residence only. The Tenant shall not sublet, assign or part with possession without the Landlord's written consent.`,
    `Repairs and maintenance. The Tenant shall report defects through the renton app. renton will investigate and, with the Landlord's approval, arrange repairs by a vetted technician. The Tenant is responsible for damage caused by the Tenant or their guests.`,
    `Alterations. The Tenant shall not make structural alterations or additions without the Landlord's prior written consent.`,
    `Utilities and service charge. The Tenant shall pay for electricity, water, waste disposal and any estate service charge for the term, unless stated otherwise.`,
    `Access. The Landlord or renton may inspect the premises at reasonable times with at least 24 hours' notice, except in an emergency.`,
    `Renewal and notice. The Tenant shall tell the Landlord, through renton, whether they intend to renew or vacate at least 30 days before the expiry date. Either party may end the tenancy as permitted by the applicable state tenancy law.`,
    `Quiet enjoyment. Provided the Tenant keeps to these terms, the Tenant may occupy the premises without interruption by the Landlord.`,
    `Governing law. This agreement is governed by the tenancy laws applicable in ${property.state} State, Nigeria.`,
  ];
  clauses.forEach((c, i) => w.para(`${i + 1}. ${c}`, { size: 9.5, gap: 4 }));

  w.y += 10;
  w.heading("Signatures");
  w.ensure(110);
  const colW = (w.w - w.m * 2 - 30) / 2;
  const sigY = w.y;
  [
    ["Signed by the Landlord", landlord.name],
    ["Signed by the Tenant", tenant.name],
  ].forEach(([label, name], i) => {
    const x = w.m + i * (colW + 30);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED).text(label, x, sigY);
    doc.setFont("times", "italic").setFontSize(18).setTextColor(...BRAND).text(name, x, sigY + 34);
    doc.setDrawColor(203, 213, 225).line(x, sigY + 42, x + colW, sigY + 42);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED).text(`E-signed via renton Â· ${formatDate(invoice.verifiedAt ?? new Date().toISOString())}`, x, sigY + 56);
  });
  w.y = sigY + 80;

  w.para("This is a sample agreement generated by the renton prototype. The final template must be reviewed by a qualified Nigerian lawyer before use.", { size: 8.5, color: MUTED });
  w.footer(`Agreement ${invoice.agreementNumber} Â· renton Technologies Ltd Â· hello@renton.ng`);
  return doc;
}

export async function downloadTenancyAgreement(ctx: DocContext) {
  (await buildTenancyAgreement(ctx)).save(`renton-Tenancy-Agreement-${fileSafe(ctx.property.area)}-${ctx.invoice.agreementNumber}.pdf`);
}


