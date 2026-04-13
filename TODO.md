# Invoice Download & Link Generation (Matching PrintInvoice Format)

**Goal**: Backend PDF generation matching PrintInvoice.jsx exactly + public share links + fix ₹ currency display.

## Current Status
```
- [ ] Install puppeteer
- [ ] Backend PDF endpoint (puppeteer renders PrintInvoice HTML)
- [ ] Public invoice view route
- [ ] Update InvoiceDetail download button
- [ ] Fix formatCurrency ₹ symbol
- [ ] Test downloads match PrintInvoice format
- [ ] Test public links work without auth
```

**Technical Approach**:
- Puppeteer: Headless browser renders PrintInvoice component HTML with invoice data → PDF
- Public route: `/public/invoice/:id` serves SSR PrintInvoice without auth
- Currency: Fix `formatCurrency` to always show ₹ prefix
