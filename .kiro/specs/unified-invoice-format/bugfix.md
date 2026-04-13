# Bugfix Requirements Document

## Introduction

The invoice workflow renders invoice data in three distinct places — the detail view (`InvoiceDetail.jsx`), the print/PDF page (`PrintInvoice.jsx`), and the server-side PDF download (`buildInvoiceHTML` in `invoiceController.js`) — each using a completely different layout, styling approach, and set of displayed fields. This means a customer viewing an invoice in the app sees a different format than what gets printed or downloaded as a PDF, which is confusing and unprofessional. The fix is to extract a single canonical invoice layout (a shared `InvoiceDocument` component) and use it everywhere, so the detail view, print page, and generated PDF all render identically.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user opens the invoice detail page (`/invoices/:id`) THEN the system renders a Tailwind CSS card-based layout with no GST breakup table, no green accent bars, no highlighted Grand Total / Paid / Balance Due boxes, and no authorised signatory footer

1.2 WHEN a user opens the print/PDF page (`/invoices/:id/print`) THEN the system renders a fully styled inline-CSS layout with green accent bars, a dark table header, a GST breakup table, highlighted totals boxes, and an authorised signatory footer — visually different from the detail page

1.3 WHEN a user downloads a PDF via the server endpoint (`GET /api/invoices/:id/pdf`) THEN the system generates HTML via `buildInvoiceHTML()` in `invoiceController.js` — a third independent implementation with its own inline styles, producing output that differs from both the detail page and the print page (e.g. missing `letterSpacing` on some elements, different colour values)

1.4 WHEN the invoice detail page displays item totals THEN the system shows a plain `w-56` div with no "Balance Due" highlighted box, while the print page shows colour-coded Paid and Balance Due boxes

1.5 WHEN the invoice detail page is viewed THEN the system omits the GST breakup table that is present on the print page and in the server-generated PDF

1.6 WHEN the invoice detail page is viewed THEN the system omits the authorised signatory section that is present on the print page and in the server-generated PDF

### Expected Behavior (Correct)

2.1 WHEN a user opens the invoice detail page THEN the system SHALL render the same canonical invoice layout (green accent bars, dark table header, GST breakup table, highlighted totals, authorised signatory footer) as the print page

2.2 WHEN a user opens the print/PDF page THEN the system SHALL render the canonical invoice layout, unchanged from the current print page design (this is the reference format)

2.3 WHEN a user downloads a PDF via the server endpoint THEN the system SHALL generate HTML that matches the canonical invoice layout, using the same structure, colours, and field set as the frontend print page

2.4 WHEN any invoice view renders item totals THEN the system SHALL display colour-coded Paid (green) and Balance Due (red/green) highlighted boxes consistently across all views

2.5 WHEN any invoice view renders items with GST rates THEN the system SHALL display the GST breakup table consistently across all views

2.6 WHEN any invoice view renders the invoice footer THEN the system SHALL display the payment mode, "computer-generated invoice" note, and authorised signatory section consistently across all views

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user navigates to the print page and clicks Print THEN the system SHALL CONTINUE TO trigger the browser print dialog with the invoice filling the A4 page

3.2 WHEN a user clicks "Download PDF" on the print page THEN the system SHALL CONTINUE TO capture the rendered invoice as a PDF using `html2canvas` + `jsPDF` and save it locally

3.3 WHEN a user clicks "Share on WhatsApp" from any invoice view THEN the system SHALL CONTINUE TO open a WhatsApp link with the invoice summary message

3.4 WHEN a user clicks "Record Payment" on the invoice detail page THEN the system SHALL CONTINUE TO open the payment modal and allow recording a payment

3.5 WHEN a user views an inter-state invoice THEN the system SHALL CONTINUE TO display IGST instead of CGST + SGST in the GST breakup and totals sections

3.6 WHEN a user views an intra-state invoice THEN the system SHALL CONTINUE TO display CGST and SGST split in the GST breakup and totals sections

3.7 WHEN the invoice has no GST-rated items THEN the system SHALL CONTINUE TO hide the GST breakup table

3.8 WHEN the invoice detail page loads THEN the system SHALL CONTINUE TO show the action bar (Back, Edit, Print/PDF, WhatsApp, Record Payment buttons) above the invoice

3.9 WHEN the server generates a PDF THEN the system SHALL CONTINUE TO return it as a downloadable `application/pdf` response with the correct filename

---

## Bug Condition Pseudocode

**Bug Condition Function** — identifies which render contexts are affected:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type InvoiceRenderContext
  OUTPUT: boolean

  // Bug is triggered whenever the invoice is rendered outside of PrintInvoice.jsx
  RETURN X.renderContext ∈ { "detail-page", "server-pdf" }
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  layout ← renderInvoice'(X)
  ASSERT layout.hasGreenAccentBars = true
  ASSERT layout.hasGSTBreakupTable = (X.invoice.hasGSTItems = true)
  ASSERT layout.hasHighlightedTotalsBoxes = true
  ASSERT layout.hasAuthorisedSignatory = true
  ASSERT layout.visuallyMatchesPrintPage = true
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  // PrintInvoice.jsx render is the reference — must remain unchanged
  ASSERT renderInvoice(X) = renderInvoice'(X)
END FOR
```
