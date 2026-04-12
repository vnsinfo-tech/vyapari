# INVOICE GRAND TOTAL FIX PLAN

**Status: In Progress**

## Steps:
- [x] 1. Create this TODO.md
- [x] 2. Edit server/controllers/invoiceController-fixed.js: Added parseFloat/rounding/Number.toFixed in create/updateInvoice item maps. Syntax fixed.
- [ ] 2. Edit server/controllers/invoiceController-fixed.js: Add robust Number/parseFloat + rounding(.toFixed(2)) in createInvoice/updateInvoice for all numerics (qty,rate,discount,gstRate,shipping,paidAmount). Handle empty items. Consistent status logic.
- [ ] 3. Test: Create/update invoice via API/client, verify grandTotal/dueAmount
- [ ] 4. Optional: client/src/pages/CreateInvoice.jsx - ensure numeric fields toFixed(2)
- [ ] 5. Backup/replace server/controllers/invoiceController.js with fixed version
- [ ] 6. Git commit changes
- [ ] 7. Test full flow (PDF, list, etc.)
- [ ] 8. Mark complete & attempt_completion

