import { useState, useEffect } from 'react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (ruc: string, razonSocial: string) => void;
  totalAmount: number;
  cedula?: string;
  userName?: string;
}

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
  activeInput: 'ruc' | null;
}

function VirtualKeyboard({ onKeyPress, activeInput }: VirtualKeyboardProps) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['0', '-'],
  ];

  const specialKeys = [
    { key: 'BACKSPACE', label: '⌫', width: 'w-24' },
    { key: 'CLEAR', label: 'LIMPIAR', width: 'w-24' },
  ];

  if (!activeInput) return null;

  return (
    <div className="bg-gray-100 p-4 rounded-lg border-t border-gray-300">
      <div className="space-y-2">
        {keys.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => onKeyPress(key)}
                className="w-20 h-16 bg-white border border-gray-300 rounded-md text-2xl font-semibold hover:bg-gray-50 active:bg-gray-200 transition-colors"
              >
                {key}
              </button>
            ))}
          </div>
        ))}

        {/* Special keys row */}
        <div className="flex justify-center gap-2 mt-3">
          {specialKeys.map((specialKey) => (
            <button
              key={specialKey.key}
              onClick={() => onKeyPress(specialKey.key)}
              className={`${specialKey.width} h-16 bg-primary-400 text-white rounded-md text-lg font-semibold`}
            >
              {specialKey.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PaymentModal({ isOpen, onClose, onConfirm, totalAmount, cedula, userName }: PaymentModalProps) {
  const [ruc, setRuc] = useState('');
  const [activeInput, setActiveInput] = useState<'ruc' | null>(null);

  // Datos hardcodeados
  const dv = '0';
  const razonSocial = 'Usuario';
  const email = 'usuario@ejemplo.com';
  const setDv = () => {};
  const setRazonSocial = () => {};
  const setEmail = () => {};

  useEffect(() => {
    if (isOpen) {
      setRuc(cedula || '');
      setActiveInput(null);
    }
  }, [isOpen, cedula]);

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;

    if (key === 'BACKSPACE') {
      setRuc(prev => prev.slice(0, -1));
    } else if (key === 'CLEAR') {
      setRuc('');
    } else if (/[0-9]/.test(key)) {
      setRuc(prev => prev + key);
    }
  };

  const handleConfirm = () => {
    const finalRuc = ruc.trim() || '12345678';
    const fullRuc = dv ? `${finalRuc}-${dv}` : finalRuc;
    onConfirm(fullRuc, razonSocial);
  };

  const handleInputClick = (_input?: string) => {
    setActiveInput('ruc');
  };

  const handleInputFocus = (_input?: string) => {
    setActiveInput('ruc');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 min-h-[0vh] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary-400 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold"></h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
          {/* <div className="mt-2">
            <p className="text-primary-100">Total a pagar: ₲{totalAmount.toLocaleString('es-PY')}</p>
          </div> */}
        </div>

        {/* Form */}
        <div className="p-6 flex flex-col flex-1 bg-primary-50">
          <div className="space-y-6">
            {/* RUC Field */}
            <div>
              <label className="block text-3xl font-bold text-gray-600 mb-4">
                RUC 
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  id="ruc"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  onFocus={() => handleInputFocus('ruc')}
                  onClick={() => handleInputClick('ruc')}
                  placeholder="12345678"
                  className="flex-1 px-6 py-6 border-2 border-gray-300 rounded-lg text-3xl font-bold text-gray-600 focus:border-primary-500 focus:outline-none transition-colors"
                  maxLength={8}
                  readOnly
                />
                
                <input
                  type="text"
                  id="dv"
                  value={dv}
                  className="w-20 px-6 py-6 border-2 border-gray-300 rounded-lg text-2xl text-center bg-gray-100"
                  readOnly
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Ingrese el DV (dígito verificador)</p>
            </div>

            {/* Razón Social Field */}
            <div>
              <label htmlFor="razonSocial" className="block text-3xl font-bold text-gray-600 mb-4">
                Razón Social 
              </label>
              <input
                type="text"
                id="razonSocial"
                value={razonSocial}
                className="w-full px-6 py-6 border-2 border-gray-300 mb-2 rounded-lg text-3xl font-bold text-gray-600 bg-gray-100"
                readOnly
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-3xl font-bold text-gray-600 mb-4">
                Email
              </label>
              <input
                type="text"
                id="email"
                value={email}
                className="w-full px-6 py-6 border-2 border-gray-300 mb-2 rounded-lg text-3xl font-bold text-gray-600 bg-gray-100"
                readOnly
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            {/* Sin Factura Button */}
            <div className="flex justify-center">
              <button
                onClick={handleConfirm}
                className="w-full py-12 px-12 bg-primary-400 text-white rounded-lg text-3xl font-semibold hover:bg-orange-600 transition-colors"
              >
                Confirmar y Pagar
              </button>
            </div>

            {/* Regular Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => onConfirm('X', 'SIN NOMBRE')}
                className="flex-1 py-12 px-12 bg-primary-400 text-white rounded-lg text-3xl font-semibold hover:bg-primary-700 transition-colors"
              >
                Factura Sin Nombre
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-12 bg-primary-50 px-12 border-2 border-gray-300 text-gray-700 rounded-lg text-3xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>

        {/* Virtual Keyboard */}
        <VirtualKeyboard onKeyPress={handleKeyPress} activeInput={activeInput} />
      </div>
    </div>
  );
}