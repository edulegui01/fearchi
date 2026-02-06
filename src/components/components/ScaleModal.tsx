import caritaPosible from '../../assets/carita_posible.png';

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
            src={caritaPosible} 
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

        
      </div>
    </div>
  );
}