import imagenBalanza from '../../assets/imagenBalanza.png';

interface ScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  userName?: string;
}

export default function ScaleModal({ isOpen, onClose, message, userName }: ScaleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 p-10">
        {/* Imagen de la balanza */}
        <div className="flex justify-center mb-8">
          <img 
            src={imagenBalanza} 
            alt="Balanza"
            className="w-96 h-96 object-contain"
          />
        </div>

        {/* Mensaje */}
        <div className="text-center mb-8">
          <p className="text-4xl font-semibold text-gray-800">
            {message}
          </p>
        </div>

        {/* Botón para cerrar - Solo mostrar si no es mensaje de error */}
        {!message.includes("no coinciden") && (
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-primary-600 text-white px-8 py-3 text-lg rounded-lg hover:bg-primary-700 transition-colors duration-200"
            >
              Continuar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}