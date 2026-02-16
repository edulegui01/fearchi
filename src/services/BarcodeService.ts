class BarcodeService {
  private barcodeBuffer: string = '';
  private bufferTimeout: number | null = null;
  private isListening: boolean = false;
  private onBarcodeScanned: ((barcode: string) => void) | null = null;
  private readonly BUFFER_TIMEOUT = 100; // ms para considerar fin de escaneo
  private _navigate: ((path: string, options?: any) => void) | null = null;

  // Establecer callback para cuando se escanee un código
  setOnBarcodeScanned(callback: (barcode: string) => void) {
    this.onBarcodeScanned = callback;
  }

  // Iniciar escucha con buffer de teclado
  startListening() {
    if (this.isListening) {
      console.log('🔄 BarcodeService ya está escuchando');
      return;
    }

    this.isListening = true;
    console.log('🎯 BarcodeService iniciado - Configurando listener de teclado...');

    // Agregar listener global para capturar todas las teclas
    document.addEventListener('keydown', this.handleKeyDown);

    console.log('✅ Listener de teclado configurado');
  }

  // Detener escucha
  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    console.log('🛑 Deteniendo BarcodeService...');

    // Remover listener global
    document.removeEventListener('keydown', this.handleKeyDown);

    // Limpiar buffer y timeout
    this.clearBuffer();
    this.onBarcodeScanned = null;
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Ignorar teclas especiales y combinaciones
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // Ignorar si el foco está en un input, textarea o elemento editable
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      (activeElement as HTMLElement).contentEditable === 'true'
    )) {
      return;
    }

    if (event.key === 'Enter') {
      // Enter indica fin del código de barras
      this.processBuffer();
    } else if (event.key.length === 1) {
      // Solo caracteres imprimibles
      this.addToBuffer(event.key);
    }
  };

  private addToBuffer(char: string) {
    this.barcodeBuffer += char;
    console.log('📝 Buffer actual:', this.barcodeBuffer);

    // Reiniciar timeout
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
    }

    // Procesar buffer automáticamente después del timeout
    this.bufferTimeout = setTimeout(() => {
      this.processBuffer();
    }, this.BUFFER_TIMEOUT);
  }

  private processBuffer() {
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }

    const barcode = this.barcodeBuffer.trim();

    if (barcode.length > 0 && this.onBarcodeScanned) {
      console.log('✅ Código de barras escaneado:', barcode);
      this.onBarcodeScanned(barcode);
    }

    this.barcodeBuffer = '';
  }

  private clearBuffer() {
    this.barcodeBuffer = '';
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  }

  // Método para limpiar manualmente el buffer si es necesario
  clearCurrentBuffer() {
    this.clearBuffer();
  }

  // Nueva función para manejar escaneo con petición API
  async handleBarcodeWithAPI(barcode: string): Promise<void> {
    try {
      console.log('🔍 Buscando producto con código:', barcode);

      // Importar dinámicamente para evitar dependencias circulares
      const ProductService = (await import('./product/ProductService')).default;

      // Hacer petición GET al endpoint
      const product = await ProductService.getProductByBarcode(barcode);

      if (product) {
        console.log('✅ Producto encontrado:', product);
        this.dispatchProductFoundEvent(product);
      }
    } catch (error) {
      // Importar ApiError para verificar el tipo
      const { ApiError } = await import('../utils/ApiError');

      // Verificar si es un error 404 (producto no encontrado)
      if (error instanceof ApiError && error.status === 404) {
        console.warn('❌ Producto no encontrado para el código:', barcode);
        // Pasar el mensaje de error de la API
        const errorMessage = error.response?.message || error.message;
        this.dispatchProductNotFoundEvent(barcode, errorMessage);
      } else {
        // Para otros errores (red, servidor, etc.)
        console.error('💥 Error al buscar producto:', error);
        this.dispatchBarcodeErrorEvent(barcode, error);
      }
    }
  }

  // Disparar evento cuando se encuentra un producto
  private dispatchProductFoundEvent(product: any) {
    const event = new CustomEvent('productFound', {
      detail: { product }
    });
    window.dispatchEvent(event);
  }

  // Disparar evento cuando no se encuentra un producto
  private dispatchProductNotFoundEvent(barcode: string, message?: string) {
    const event = new CustomEvent('productNotFound', {
      detail: {
        barcode,
        message: message || `Producto con código "${barcode}" no encontrado`
      }
    });
    window.dispatchEvent(event);
  }

  // Disparar evento cuando hay error en la búsqueda
  private dispatchBarcodeErrorEvent(barcode: string, error: any) {
    const event = new CustomEvent('barcodeError', {
      detail: { barcode, error }
    });
    window.dispatchEvent(event);
  }

  // Método para configurar manejo automático con API
  setAutomaticAPIHandling(enabled: boolean = true) {
    if (enabled) {
      this.setOnBarcodeScanned((barcode) => {
        this.handleBarcodeWithAPI(barcode);
      });
    } else {
      this.onBarcodeScanned = null;
    }
  }

  // Nueva función para manejar escaneo con API de productos (devuelve Product)
  async handleBarcodeWithProductAPI(barcode: string): Promise<void> {
    try {
      console.log('🔍 Buscando producto en API de productos con código:', barcode);

      const ProductService = (await import('./product/ProductService')).default;

      const product = await ProductService.getProductByBarcodeApi(barcode);

      if (product) {
        console.log('✅ Producto encontrado en API de productos:', product);
        this.dispatchProductFoundEvent(product);
      }
    } catch (error) {
      const { ApiError } = await import('../utils/ApiError');

      if (error instanceof ApiError && error.status === 404) {
        console.warn('❌ Producto no encontrado para el código:', barcode);
        const errorMessage = error.response?.message || error.message;
        this.dispatchProductNotFoundEvent(barcode, errorMessage);
      } else {
        console.error('💥 Error al buscar producto:', error);
        this.dispatchBarcodeErrorEvent(barcode, error);
      }
    }
  }

  // Método para configurar manejo automático con API de productos (Product)
  setAutomaticProductAPIHandling(enabled: boolean = true) {
    if (enabled) {
      this.setOnBarcodeScanned((barcode) => {
        this.handleBarcodeWithProductAPI(barcode);
      });
    } else {
      this.onBarcodeScanned = null;
    }
  }
}

export const barcodeService = new BarcodeService();
export default BarcodeService;