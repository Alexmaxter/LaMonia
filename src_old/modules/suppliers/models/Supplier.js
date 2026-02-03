export class Supplier {
  /**
   * @param {Object} data
   * @param {string} [data.id] - ID de Firebase (opcional al crear)
   * @param {string} data.name - Razón social o nombre
   * @param {string} [data.cuit] - CUIT / RUT / NIF
   * @param {string} [data.phone] - Teléfono de contacto
   * @param {string} [data.email] - Correo electrónico
   * @param {string} [data.address] - Dirección física
   * @param {number} [data.balance] - Saldo actual (Positivo = Deuda nuestra)
   * @param {boolean} [data.isActive] - Para borrado lógico
   * @param {Date} [data.createdAt]
   */
  constructor({
    id = null,
    name,
    cuit = "",
    phone = "",
    email = "",
    address = "",
    balance = 0,
    isActive = true,
    createdAt = new Date(),
  }) {
    this.id = id;
    this.name = name;
    this.cuit = cuit;
    this.phone = phone;
    this.email = email;
    this.address = address;
    this.balance = Number(balance); // Aseguramos que sea número
    this.isActive = isActive;
    this.createdAt = createdAt;
  }

  // Método para convertir a objeto plano (JSON) para guardar en Firebase
  toFirestore() {
    return {
      name: this.name,
      cuit: this.cuit,
      phone: this.phone,
      email: this.email,
      address: this.address,
      balance: this.balance,
      isActive: this.isActive,
      // Nota: createdAt suele manejarse con serverTimestamp() en el servicio,
      // pero si lo pasas manual, iría aquí.
    };
  }

  // Método estático para crear la instancia desde lo que devuelve Firebase
  static fromFirestore(doc) {
    const data = doc.data();
    return new Supplier({
      id: doc.id,
      ...data,
      // Convertir Timestamp de Firebase a Date de JS si es necesario
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
    });
  }
}
