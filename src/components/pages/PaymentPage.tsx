import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import scoLogo from '../../assets/sco-logo.png';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Obtener datos del state de navegación
  const { products: _products = [], totalAmount = 0, ruc = '', razonSocial = '', productQuantities: _productQuantities = {} } = location.state || {};
  const [qrCode, setQrCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
        
        // Simular pago exitoso después de 5 segundos
        setTimeout(() => {
          setShowSuccessModal(true);
          
          // Navegar automáticamente después de 2 segundos
          setTimeout(() => {
            handleSuccessClose();
          }, 2000);
        }, 5000);
      }, 2000);
    };

    generateQR();
  }, [totalAmount]);


  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Limpiar sessionStorage y navegar a welcome
    sessionStorage.removeItem('currentOrder');
    navigate('/welcome');
  };

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
          {/* Billing Data */}
          {(ruc || razonSocial) && (
            <div className="bg-white rounded-lg p-6 mb-6 border-l-4 border-primary-600">
              <h3 className="text-2xl font-bold text-gray-700 mb-4">Datos de Facturación</h3>
              <div className="space-y-3">
                {ruc && (
                  <div className="flex">
                    <span className="font-bold text-gray-600 w-32 text-xl">RUC:</span>
                    <span className="text-gray-800 text-xl">{ruc}</span>
                  </div>
                )}
                {razonSocial && (
                  <div className="flex">
                    <span className="font-bold text-gray-600 w-32 text-xl">Razón Social:</span>
                    <span className="text-gray-800 text-xl">{razonSocial}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Total Amount */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-primary-700 mb-2">
              Total a Pagar
            </h2>
            <p className="text-6xl font-bold text-primary-600">
              ₲{totalAmount.toLocaleString('es-PY')}
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
                    size={320}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    value={qrCode}
                    viewBox={`0 0 320 320`}
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
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={() => navigate('/vertical-products')}
            className="bg-secondary-600 text-black py-6 px-16 rounded-lg text-2xl font-semibold min-w-56
                       hover:bg-secondary-700 transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Modal de Pago Exitoso */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
            {/* Icono de éxito */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* Título */}
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-4">
              ¡Pago Exitoso!
            </h2>
            
            {/* Mensaje */}
            <p className="text-lg text-center text-gray-600 mb-6">
              Su pago ha sido procesado correctamente.
            </p>
            
            {/* Monto */}
            <div className="text-center mb-6">
              <p className="text-2xl font-bold text-green-600">
                ₲{totalAmount.toLocaleString('es-PY')}
              </p>
            </div>
            
            {/* Indicador de navegación automática */}
            <div className="flex justify-center">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}