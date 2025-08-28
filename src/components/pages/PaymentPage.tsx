import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import scoLogo from '../../assets/sco-logo.png';

interface Product {
  cod_barra: string;
  description: string;
  category_id: number;
  name: string;
  sku: string;
  imagen: string;
  precio: number;
  peso: number;
  es_pesable: boolean;
  purchase_price: number;
  tax: number;
  stock: number;
  stock_min: number;
  active: boolean;
}

interface PaymentPageProps {
  products?: Product[];
  totalAmount?: number;
  onPaymentSuccess?: () => void;
  onCancel?: () => void;
}

export default function PaymentPage({ onPaymentSuccess, onCancel }: PaymentPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Obtener datos del state de navegación
  const { products = [], totalAmount = 0 } = location.state || {};
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simular generación de QR (aquí puedes integrar con tu servicio de pagos)
    const generateQR = async () => {
      setIsLoading(true);
      
      // Simular delay de generación de QR
      setTimeout(() => {
        // URL específica para el QR
        const qrData = "afdsfadsfsadfasdfasdfasdf";
        setQrCode(qrData);
        setIsLoading(false);
      }, 2000);
    };

    generateQR();
  }, [totalAmount]);

  return (
    <div className="min-h-screen bg-primary-400 flex flex-col p-6">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={scoLogo} 
              alt="Fe-SCO"
              className="h-32 w-auto"
            />
          </div>
        </div>

        {/* Payment Content */}
        <div className="h-[65vh] bg-primary-50 p-6 rounded-lg shadow-inner flex flex-col">
          {/* Total Amount */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-primary-700 mb-2">
              Total a Pagar
            </h2>
            <p className="text-6xl font-bold text-primary-600">
              ${totalAmount.toFixed(2)}
            </p>
          </div>

          {/* QR Section */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {isLoading ? (
              <div className="text-center">
                {/* Loading Spinner */}
                <div className="flex justify-center mb-6">
                  <div className="animate-spin rounded-full h-24 w-24 border-4 border-primary-200 border-t-primary-600"></div>
                </div>
                
                <h3 className="text-2xl font-semibold text-primary-700 mb-4">
                  Generando código QR...
                </h3>
                
                <p className="text-lg text-secondary-800">
                  Por favor espere
                </p>
              </div>
            ) : (
              <div className="text-center">
                {/* QR Code Real */}
                <div className="bg-white p-8 rounded-lg shadow-lg mb-6 inline-block relative">
                  <QRCode
                    size={256}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={qrCode}
                    viewBox={`0 0 256 256`}
                  />
                  {/* Logo en el centro del QR */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-white rounded-md p-2 shadow-lg">
                      <img 
                        src={scoLogo} 
                        alt="Fe-SCO"
                        className="h-12 w-12 object-contain"
                      />
                    </div>
                  </div>
                </div>
                
                <h3 className="text-3xl font-semibold text-primary-700 mb-4">
                  Esperando el pago
                </h3>
                
                <div className="flex justify-center space-x-2 mb-6">
                  <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                
                <p className="text-lg text-secondary-800">
                  Escanea el código QR con tu aplicación de pago
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8 mt-6">
          <button
            onClick={() => navigate('/vertical-products')}
            className="bg-secondary-600 text-black py-6 px-20 rounded-lg text-2xl font-semibold min-w-64
                       hover:bg-secondary-700 transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}