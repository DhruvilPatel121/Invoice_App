Requirements Document

1. Application Overview
   Application Name: Shivvilon Solutions Invoice Management System

Description: A premium web-based invoice management system for creating, managing, and tracking invoices with comprehensive reporting and PDF generation capabilities. The system supports GST calculations, multiple payment methods, and provides a modern dashboard for business insights.

2. Users and Usage Scenarios
   Target Users: Business owners, accountants, finance managers of Shivvilon Solutions

Core Usage Scenarios:

Create and send professional invoices to clients
Track payment status and overdue invoices
Generate financial reports and analytics
Manage client information and invoice history
Export invoices as PDF documents 3. Page Structure and Functionality
Page Hierarchy
├── Dashboard (Home)
├── Invoice Management
│ ├── Invoice List
│ ├── Create Invoice
│ ├── Edit Invoice
│ └── View Invoice
├── Reports
└── Settings
3.1 Dashboard
Statistics Cards:

Display Total Invoices count
Display Paid Amount sum
Display Pending Amount sum
Display Overdue Amount sum
Display Total Clients count
Recent Invoices List:

Show latest 5-10 invoices with invoice number, client name, date, amount, status
Click to view invoice details
Charts:

Monthly Revenue Chart: bar chart showing revenue per month
Yearly Revenue Chart: line chart showing yearly trends
Invoice Status Pie Chart: distribution of invoice statuses
Recent Activity Timeline:

Display recent invoice actions (created, paid, sent, etc.) with timestamps
Upcoming Due Payments:

List invoices approaching due date or overdue
Quick Actions:

Quick Create Invoice button
Quick Search input field
Theme Toggle:

Switch between Dark Mode and Light Mode
3.2 Invoice List
Table Columns:

Invoice Number
Client Name
Invoice Date
Due Date
Total Amount
Paid Amount
Pending Amount
Status (with color badges)
Actions
Actions per Invoice:

View: open invoice details
Edit: modify invoice information
Duplicate: create copy with new invoice number
Download PDF: generate and download PDF
Print: open print dialog
Delete: remove invoice (with confirmation)
Mark Paid: update status to Paid
Mark Pending: update status to Pending
Mark Partially Paid: update status to Partially Paid
Filters:

Date Range: Today, Yesterday, Last 7 Days, Last 30 Days, Current Month, Previous Month, Current Year, Custom Date Range
Status: Draft, Sent, Viewed, Paid, Pending, Partially Paid, Cancelled, Overdue
Client: dropdown of all clients
Invoice Number: text input
Amount Range: min and max amount inputs
Search:

Instant search across Invoice Number, Client Name, GST Number, Phone, Email, Amount, Notes
Pagination:

Display invoices in pages with configurable page size
3.3 Create Invoice / Edit Invoice
Company Information Section:

Logo: upload image file
Company Name: text input
Address: textarea
GST Number: text input (optional)
Email: text input
Phone: text input
Website: text input
Bank Details: Account Name, Account Number, Bank Name, IFSC Code, SWIFT Code
UPI QR Code: upload image file
Authorized Signature: upload image file
Company Seal: upload image file
Client Information Section:

Client Name: text input
Company Name: text input
GST Number: text input (optional)
Address: textarea
Email: text input
Phone: text input
State: text input
Country: text input
ZIP Code: text input
Invoice Information Section:

Invoice Number: auto-generated (format: INV-2026-0001, INV-2026-0002, etc.), read-only
Invoice Date: date picker
Due Date: date picker
Payment Terms: text input
Currency: dropdown selection
Status: dropdown (Draft, Sent, Viewed, Paid, Pending, Partially Paid, Cancelled, Overdue)
Invoice Items Section:

Add unlimited rows
Each row contains: Description, HSN/SAC Code, Quantity, Unit, Rate, Discount, Tax, Amount
Amount auto-calculated as: (Quantity × Rate - Discount) + Tax
Add Row button, Delete Row button per row
GST Toggle Switch:

When disabled: hide GST-related columns and calculations
When enabled: display CGST, SGST, IGST fields and auto-calculate Total GST
Discount Section:

Discount Type: Percentage, Fixed Amount, Coupon
Discount Value: numeric input
Round Off: checkbox and amount input
Totals Display:

Subtotal: sum of all item amounts
Discount: calculated discount amount
GST (if enabled): CGST + SGST + IGST
Grand Total: Subtotal - Discount + GST
Amount in Words: auto-generated text
Payment Details Section:

Payment Method: Cash, UPI, Bank Transfer, Cheque, Card, Other
Transaction ID: text input
Payment Date: date picker
Payment Notes: textarea
Action Buttons:

Save as Draft
Save and Send
Cancel
3.4 View Invoice
Display Sections:

Company Information (logo, name, address, GST, contact details)
Client Information (name, company, address, GST, contact details)
Invoice Details (number, date, due date, status)
Items Table (description, HSN/SAC, quantity, unit, rate, discount, tax, amount)
Totals (subtotal, discount, GST if enabled, grand total, amount in words)
Payment Information (bank details, UPI QR code)
Terms and Conditions
Authorized Signature and Company Seal
Actions:

Edit Invoice
Download PDF
Print
Mark as Paid/Pending/Partially Paid
Delete
Invoice History:

Created Date and Time
Updated Date and Time
Paid Date
Printed Date
Downloaded Date
Last Modified By
3.5 Reports
Report Types:

Monthly Revenue Report: revenue breakdown by month
Yearly Revenue Report: revenue breakdown by year
Paid Invoices Report: list of all paid invoices
Pending Invoices Report: list of all pending invoices
Top Clients Report: clients ranked by total invoice amount
Invoice Count Report: count of invoices by status
Payment Trends Report: payment patterns over time
Export Options:

Export to PDF
Export to Excel
Filters:

Date Range selection
Status filter
Client filter
3.6 Settings
Company Settings:

Update Company Details (name, address, GST, email, phone, website)
Upload/Change Company Logo
Update Bank Details
Upload/Change UPI QR Code
Upload/Change Authorized Signature
Upload/Change Company Seal
Invoice Settings:

Default GST Rate: numeric input
Default Currency: dropdown
Invoice Number Prefix: text input
Invoice Number Format: text input
Default Payment Terms: text input
Default Notes: textarea
Appearance Settings:

Theme: Dark Mode / Light Mode toggle
Data Management:

Backup Database: download backup file
Restore Database: upload backup file
Export All Data: download all data as file
Import Data: upload data file 4. Business Rules and Logic
Invoice Number Generation
Auto-generate invoice numbers in format: INV-YYYY-NNNN (e.g., INV-2026-0001)
YYYY represents current year
NNNN is sequential number starting from 0001
Increment number for each new invoice within the same year
Reset to 0001 at the start of new year
Invoice Amount Calculation
Item Amount = (Quantity × Rate - Discount) + Tax
Subtotal = Sum of all Item Amounts
Total Discount = Discount value (percentage or fixed amount)
When GST enabled:
Calculate CGST, SGST, IGST based on GST rates
Total GST = CGST + SGST + IGST
Grand Total = Subtotal - Total Discount + Total GST (if enabled)
Convert Grand Total to words in English
Invoice Status Logic
Draft: invoice created but not finalized
Sent: invoice sent to client
Viewed: client has viewed the invoice
Paid: full payment received, Paid Amount = Grand Total
Pending: no payment received, Paid Amount = 0
Partially Paid: partial payment received, 0 < Paid Amount < Grand Total
Cancelled: invoice cancelled
Overdue: Due Date passed and status is Pending or Partially Paid
Status Badge Colors
Green: Paid
Blue: Sent, Viewed
Orange: Pending, Partially Paid
Red: Overdue
Gray: Draft, Cancelled
GST Toggle Behavior
When GST toggle is OFF:
Hide all GST-related fields (CGST, SGST, IGST, Total GST)
Hide GST columns in items table
Exclude GST from Grand Total calculation
When GST toggle is ON:
Display all GST-related fields
Auto-calculate GST amounts
Include GST in Grand Total
Data Persistence
All invoice data saved to Supabase database
Auto-save draft invoices every few seconds
Maintain complete invoice history with timestamps
Duplicate Invoice
Copy all fields from original invoice
Generate new invoice number
Set status to Draft
Reset payment information
Set invoice date to current date 5. Exceptions and Edge Cases
Scenario Handling
Delete invoice with Paid status Show confirmation dialog warning that paid invoice will be deleted
Edit invoice after marked as Paid Allow editing but show warning message
Duplicate invoice number System prevents duplicate numbers through auto-generation
Invalid GST number format Display validation error message
Due date earlier than invoice date Display validation error and prevent saving
Empty invoice items Require at least one item before saving
Negative quantity or rate Display validation error
Missing required client information Highlight missing fields and prevent saving
Network error during save Display error message and retain unsaved data
PDF generation failure Display error message and allow retry
Large dataset loading Show loading skeleton and implement pagination
No invoices found in search/filter Display empty state with helpful message
Backup file corrupted Display error message and prevent restore
Invalid file format for logo/signature upload Display error message and reject upload 6. Acceptance Criteria
User opens the application and views Dashboard with statistics cards showing Total Invoices, Paid Amount, Pending Amount, Overdue Amount, and Total Clients
User clicks Quick Create Invoice button, fills in company information, client information, invoice details, adds multiple invoice items, enables GST toggle, and saves the invoice
System auto-generates invoice number in format INV-2026-XXXX and saves invoice to Supabase database
User navigates to Invoice List, searches for the created invoice by client name, and views the invoice details
User clicks Download PDF button and system generates professional A4 invoice PDF with company logo, invoice details, items table, GST calculations, bank details, and authorized signature
User marks invoice as Paid, and Dashboard statistics update to reflect the payment
User navigates to Reports, selects Monthly Revenue Report, and exports the report to Excel
User switches theme from Light Mode to Dark Mode in Settings, and entire application updates appearance 7. Out of Scope for Current Release
Multi-user access control and user roles
Email integration for sending invoices directly from the system
Automated payment reminders and notifications
Recurring invoice templates and scheduling
Multi-currency conversion and exchange rates
Integration with accounting software
Mobile native applications (iOS/Android)
Client portal for viewing invoices
Inventory management
Expense tracking
Time tracking and billable hours
Project management features
CRM functionality
Advanced analytics and forecasting
API for third-party integrations
Audit logs and compliance reporting
Custom invoice templates beyond the reference format
E-signature integration
Payment gateway integration
Tax filing and compliance automation
