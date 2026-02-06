import { useState } from 'react';
import scoLogo from '../../assets/sco-logo.png';

export default function TestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string>('');

  const testData = {
    "id": 1,
    "cod_barra": "123456",
    "descripcion": "prueba",
    "category_id": 1,
    "name": "prueba",
    "sku": null,
    "imagen": null,
    "precio": 5000,
    "peso": 2000,
    "es_pesable": false,
    "purchase_price": null,
    "tax": 5,
    "stock": 10,
    "stock_min": 5,
    "active": true
  };

  const handleSendData = async () => {
    setIsLoading(true);
    setResponse('');
    
    try {
      const response = await fetch('http://10.6.1.113:3000/pesaje', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setResponse(`✅ Éxito: ${JSON.stringify(result, null, 2)}`);
      } else {
        setResponse(`❌ Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      setResponse(`❌ Error de conexión: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-400 flex flex-col p-6">
      <div className="w-full flex flex-col">
        {/* Header */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={scoLogo} 
              alt="Fe-SCO"
              className="h-32 w-auto"
            />
          </div>
          <h1 className="text-4xl font-bold text-center text-primary-600">
            Página de Prueba
          </h1>
        </div>

        {/* Content */}
        <div className="bg-primary-50 rounded-lg shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">
            Enviar datos de prueba al endpoint /pesaje
          </h2>
          
          {/* Data Preview */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-600 mb-3">Datos a enviar:</h3>
            <pre className="text-sm text-gray-800 overflow-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>

          {/* Endpoint Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Endpoint:</h3>
            <p className="text-blue-700">
              <strong>URL:</strong> http://10.6.1.113:3000/pesaje
            </p>
            <p className="text-blue-700">
              <strong>Method:</strong> POST
            </p>
            <p className="text-blue-700">
              <strong>Content-Type:</strong> application/json
            </p>
          </div>

          {/* Send Button */}
          <div className="flex justify-center mb-6">
            <button
              onClick={handleSendData}
              disabled={isLoading}
              className="bg-primary-600 text-white py-4 px-8 rounded-lg text-xl font-semibold hover:bg-primary-700 transition-colors disabled:bg-primary-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Enviando...
                </>
              ) : (
                'Enviar Datos'
              )}
            </button>
          </div>

          {/* Response */}
          {response && (
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-600 mb-3">Respuesta:</h3>
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}