import { z } from "zod";

// Up to 100MB matches the backend cap.
const MAX_PDF_BYTES = 100 * 1024 * 1024;

export const PdfUploadSchema = z
  .instanceof(File)
  .refine((f) => f.name.toLowerCase().endsWith(".pdf"), "Only .pdf files are accepted")
  .refine((f) => f.size > 0, "File is empty")
  .refine(
    (f) => f.size <= MAX_PDF_BYTES,
    `File too large (max ${(MAX_PDF_BYTES / 1024 / 1024) | 0} MB)`
  );

const numericString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v ?? ""))
  .refine(
    (v) => v === "" || !Number.isNaN(Number(v)),
    "Must be a number"
  );

const dateString = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v ?? "")
  .refine(
    (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Date must be YYYY-MM-DD"
  );

export const InvoiceLineSchema = z.object({
  id: z.number().optional(),
  line_no: z.number().int().nonnegative(),
  description: z.string().max(512),
  unit_qty: numericString,
  free_qty: numericString,
  unit_price: numericString,
  line_discount: numericString,
  gross_value: numericString,
});

export const InvoiceSchema = z.object({
  invoice_number: z.string().max(128),
  invoice_date: dateString,
  customer_name: z.string().max(512),
  customer_code: z.string().max(128),
  customer_address: z.string().max(2000),
  customer_tel: z.string().max(64),
  sales_rep: z.string().max(200),
  route: z.string().max(128),
  territory: z.string().max(200),
  payment_type: z.string().max(64),
  currency: z.string().max(8),
  gross_total: numericString,
  line_discount_total: numericString,
  header_discount_total: numericString,
  return_total: numericString,
  net_total: numericString,
  lines: z.array(InvoiceLineSchema),
});

export type InvoiceForm = z.infer<typeof InvoiceSchema>;
