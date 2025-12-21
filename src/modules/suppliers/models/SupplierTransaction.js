// src/modules/suppliers/models/SupplierTransaction.js
export const TRANSACTION_TYPES = {
  INVOICE: "invoice", // Aumenta deuda (+)
  PAYMENT: "payment", // Disminuye deuda (-)
  CREDIT_NOTE: "credit_note", // Disminuye deuda (-)
};

export class SupplierTransaction {
  constructor({
    id = null,
    supplierId,
    type, // invoice, payment, credit_note
    amount,
    date,
    description = "",
    invoiceNumber = null,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.supplierId = supplierId;
    this.type = type;
    this.amount = amount;
    this.date = date;
    this.description = description;
    this.invoiceNumber = invoiceNumber;
    this.createdAt = createdAt;
  }
}
