/**
 * Servicio para impresión en impresoras térmicas POS 80mm
 * Utiliza comandos ESC/POS estándar
 */

interface Product {
  cod_barra: string;
  description: string;
  name: string;
  precio: number;
  peso: number;
  es_pesable: boolean;
}

interface PrintData {
  products: Product[];
  quantities: { [key: string]: number };
  totalAmount: number;
  ruc: string;
  razonSocial: string;
  timestamp?: string;
}

class ThermalPrinterService {
  private encoder = new TextEncoder();

  // Comandos ESC/POS básicos
  private readonly ESC = '\x1B';
  private readonly GS = '\x1D';
  
  // Comandos de formato
  private readonly COMMANDS = {
    INIT: '\x1B\x40',           // Inicializar impresora
    ALIGN_LEFT: '\x1B\x61\x00',   // Alinear izquierda
    ALIGN_CENTER: '\x1B\x61\x01', // Alinear centro
    ALIGN_RIGHT: '\x1B\x61\x02',  // Alinear derecha
    BOLD_ON: '\x1B\x45\x01',      // Negrita ON
    BOLD_OFF: '\x1B\x45\x00',     // Negrita OFF
    DOUBLE_HEIGHT: '\x1B\x21\x10', // Doble altura
    NORMAL_SIZE: '\x1B\x21\x00',   // Tamaño normal
    CUT_PAPER: '\x1D\x56\x00',     // Cortar papel
    FEED_LINE: '\x0A',             // Salto de línea
    FEED_LINES: '\x1B\x64\x03',    // 3 líneas en blanco
  };

  /**
   * Genera el contenido completo de la factura
   */
  generateInvoice(data: PrintData): Uint8Array {
    let content = '';
    
    // 1. Inicializar impresora
    content += this.COMMANDS.INIT;
    
    // 2. Encabezado
    content += this.generateHeader();
    
    // 3. Datos del cliente
    content += this.generateCustomerData(data.ruc, data.razonSocial);
    
    // 4. Fecha y hora
    content += this.generateDateTime(data.timestamp);
    
    // 5. Línea separadora
    content += this.generateSeparator();
    
    // 6. Productos
    content += this.generateProductsSection(data.products, data.quantities);
    
    // 7. Línea separadora
    content += this.generateSeparator();
    
    // 8. Total
    content += this.generateTotal(data.totalAmount);
    
    // 9. Pie de página
    content += this.generateFooter();
    
    // 10. Cortar papel
    content += this.COMMANDS.FEED_LINES;
    content += this.COMMANDS.CUT_PAPER;
    
    return this.encoder.encode(content);
  }

  /**
   * Encabezado de la factura
   */
  private generateHeader(): string {
    return (
      this.COMMANDS.ALIGN_CENTER +
      this.COMMANDS.BOLD_ON +
      this.COMMANDS.DOUBLE_HEIGHT +
      'POSSCO SYSTEM\n' +
      this.COMMANDS.NORMAL_SIZE +
      this.COMMANDS.BOLD_OFF +
      'Self Check-Out\n' +
      '================================\n' +
      'TICKET DE COMPRA\n' +
      '================================\n' +
      this.COMMANDS.FEED_LINE
    );
  }

  /**
   * Datos del cliente
   */
  private generateCustomerData(ruc: string, razonSocial: string): string {
    return (
      this.COMMANDS.ALIGN_LEFT +
      this.COMMANDS.BOLD_ON +
      'CLIENTE:\n' +
      this.COMMANDS.BOLD_OFF +
      `RUC: ${ruc}\n` +
      `Razon Social: ${this.truncateText(razonSocial, 30)}\n` +
      this.COMMANDS.FEED_LINE
    );
  }

  /**
   * Fecha y hora
   */
  private generateDateTime(timestamp?: string): string {
    const now = timestamp ? new Date(timestamp) : new Date();
    const dateStr = now.toLocaleDateString('es-PY');
    const timeStr = now.toLocaleTimeString('es-PY', { hour12: false });
    
    return (
      this.COMMANDS.ALIGN_LEFT +
      `Fecha: ${dateStr}\n` +
      `Hora: ${timeStr}\n` +
      this.COMMANDS.FEED_LINE
    );
  }

  /**
   * Línea separadora
   */
  private generateSeparator(): string {
    return (
      this.COMMANDS.ALIGN_LEFT +
      '--------------------------------\n'
    );
  }

  /**
   * Sección de productos
   */
  private generateProductsSection(products: Product[], quantities: { [key: string]: number }): string {
    let content = '';
    
    // Header de productos
    content += this.COMMANDS.BOLD_ON;
    content += 'CANT PRODUCTO           PRECIO\n';
    content += this.COMMANDS.BOLD_OFF;
    content += this.generateSeparator();
    
    // Productos individuales
    products.forEach(product => {
      const quantity = quantities[product.cod_barra] || 1;
      const subtotal = product.precio * quantity;
      
      content += this.formatProductLine(
        quantity,
        product.name,
        product.precio,
        subtotal
      );
    });
    
    return content;
  }

  /**
   * Formatea una línea de producto
   */
  private formatProductLine(quantity: number, name: string, price: number, subtotal: number): string {
    // Línea 1: Cantidad y nombre del producto
    const truncatedName = this.truncateText(name, 25);
    let line1 = `${quantity.toString().padStart(2)} ${truncatedName}\n`;
    
    // Línea 2: Precio unitario y subtotal
    const priceStr = `₲${price.toLocaleString('es-PY')}`;
    const subtotalStr = `₲${subtotal.toLocaleString('es-PY')}`;
    const line2 = `   ${priceStr.padEnd(15)} ${subtotalStr.padStart(12)}\n`;
    
    return line1 + line2 + '\n';
  }

  /**
   * Total de la compra
   */
  private generateTotal(totalAmount: number): string {
    const totalStr = `₲${totalAmount.toLocaleString('es-PY')}`;
    
    return (
      this.COMMANDS.ALIGN_RIGHT +
      this.COMMANDS.BOLD_ON +
      this.COMMANDS.DOUBLE_HEIGHT +
      `TOTAL: ${totalStr}\n` +
      this.COMMANDS.NORMAL_SIZE +
      this.COMMANDS.BOLD_OFF +
      this.COMMANDS.FEED_LINE
    );
  }

  /**
   * Pie de página
   */
  private generateFooter(): string {
    return (
      this.COMMANDS.ALIGN_CENTER +
      '================================\n' +
      'GRACIAS POR SU COMPRA\n' +
      '================================\n' +
      'Sistema Self Check-Out\n' +
      'Fe-SCO v1.0\n' +
      this.COMMANDS.FEED_LINE
    );
  }

  /**
   * Trunca texto para que quepa en la línea
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text.padEnd(maxLength);
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Envía datos a la impresora
   */
  async printInvoice(data: PrintData): Promise<boolean> {
    try {
      // Generar contenido de la factura
      const printData = this.generateInvoice(data);
      
      // Verificar si Web Serial API está disponible
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API no está disponible');
      }
      
      // Solicitar puerto serie
      const port = await (navigator as any).serial.requestPort({
        filters: [
          { usbVendorId: 0x04b8 }, // Epson
          { usbVendorId: 0x0483 }, // STMicroelectronics
          { usbVendorId: 0x067b }, // Prolific
        ]
      });
      
      // Abrir puerto
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      });
      
      // Enviar datos
      const writer = port.writable.getWriter();
      await writer.write(printData);
      writer.releaseLock();
      
      // Cerrar puerto
      await port.close();
      
      console.log('✅ Factura impresa correctamente');
      return true;
      
    } catch (error) {
      console.error('❌ Error al imprimir factura:', error);
      
      // Fallback: mostrar datos en consola para debug
      this.logInvoiceToConsole(data);
      return false;
    }
  }

  /**
   * Log de la factura en consola (para debugging)
   */
  private logInvoiceToConsole(data: PrintData): void {
    console.log('\n🧾 === FACTURA GENERADA ===');
    console.log('📅 Fecha:', new Date().toLocaleString('es-PY'));
    console.log('👤 Cliente:', data.razonSocial);
    console.log('🆔 RUC:', data.ruc);
    console.log('\n📦 PRODUCTOS:');
    
    data.products.forEach(product => {
      const quantity = data.quantities[product.cod_barra] || 1;
      const subtotal = product.precio * quantity;
      console.log(`   ${quantity}x ${product.name}`);
      console.log(`      ₲${product.precio.toLocaleString('es-PY')} c/u = ₲${subtotal.toLocaleString('es-PY')}`);
    });
    
    console.log('\n💰 TOTAL:', `₲${data.totalAmount.toLocaleString('es-PY')}`);
    console.log('🧾 === FIN FACTURA ===\n');
  }

  /**
   * Verifica si la impresora está disponible
   */
  async checkPrinterAvailability(): Promise<boolean> {
    if (!('serial' in navigator)) {
      console.warn('Web Serial API no está disponible');
      return false;
    }
    
    try {
      const ports = await (navigator as any).serial.getPorts();
      return ports.length > 0;
    } catch (error) {
      console.error('Error verificando impresora:', error);
      return false;
    }
  }
}

// Instancia singleton
export const thermalPrinterService = new ThermalPrinterService();
export default ThermalPrinterService;