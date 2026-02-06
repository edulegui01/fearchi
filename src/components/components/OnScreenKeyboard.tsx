import { useState } from 'react';

interface OnScreenKeyboardProps {
  type: 'letters' | 'numbers';
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onEnter?: () => void;
  showEnter?: boolean;
}

export default function OnScreenKeyboard({
  type,
  onKeyPress,
  onBackspace,
  onClear,
  onEnter,
  showEnter = false
}: OnScreenKeyboardProps) {
  const [isUpperCase, setIsUpperCase] = useState(true);

  const lettersRow1 = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
  const lettersRow2 = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'];
  const lettersRow3 = ['Z', 'X', 'C', 'V', 'B', 'N', 'M'];

  const numbersRow1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const numbersRow2 = ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'];
  const numbersRow3 = ['.', ',', '?', '!', "'", '_', '+', '=', '*', '#'];

  const handleKeyPress = (key: string) => {
    const finalKey = type === 'letters' && !isUpperCase ? key.toLowerCase() : key;
    onKeyPress(finalKey);
  };

  return (
    <div className="bg-gray-200 rounded-2xl p-4 shadow-lg">
      {type === 'letters' ? (
        // Teclado alfabético
        <div className="space-y-2">
          {/* Primera fila */}
          <div className="flex gap-2 justify-center">
            {lettersRow1.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleKeyPress(letter)}
                className="bg-white hover:bg-gray-100 active:bg-gray-300 text-gray-800 font-bold py-4 px-5 rounded-lg text-2xl min-w-[60px] transition-colors shadow"
              >
                {isUpperCase ? letter : letter.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Segunda fila */}
          <div className="flex gap-2 justify-center">
            {lettersRow2.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleKeyPress(letter)}
                className="bg-white hover:bg-gray-100 active:bg-gray-300 text-gray-800 font-bold py-4 px-5 rounded-lg text-2xl min-w-[60px] transition-colors shadow"
              >
                {isUpperCase ? letter : letter.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Tercera fila */}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setIsUpperCase(!isUpperCase)}
              className={`${
                isUpperCase ? 'bg-primary-600 text-white' : 'bg-white text-gray-800'
              } hover:bg-primary-700 font-bold py-4 px-6 rounded-lg text-xl min-w-[80px] transition-colors shadow`}
            >
              ⬆ Mayús
            </button>

            {lettersRow3.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleKeyPress(letter)}
                className="bg-white hover:bg-gray-100 active:bg-gray-300 text-gray-800 font-bold py-4 px-5 rounded-lg text-2xl min-w-[60px] transition-colors shadow"
              >
                {isUpperCase ? letter : letter.toLowerCase()}
              </button>
            ))}

            <button
              type="button"
              onClick={onBackspace}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-lg text-xl min-w-[80px] transition-colors shadow"
            >
              ⌫ Borrar
            </button>
          </div>

          {/* Cuarta fila - Espacio y controles */}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleKeyPress(' ')}
              className="bg-white hover:bg-gray-100 active:bg-gray-300 text-gray-800 font-bold py-4 px-8 rounded-lg text-2xl flex-1 transition-colors shadow"
            >
              Espacio
            </button>

            <button
              type="button"
              onClick={onClear}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg text-xl min-w-[100px] transition-colors shadow"
            >
              Limpiar
            </button>

            {showEnter && onEnter && (
              <button
                type="button"
                onClick={onEnter}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-lg text-xl min-w-[100px] transition-colors shadow"
              >
                ✓ Enter
              </button>
            )}
          </div>
        </div>
      ) : (
        // Teclado numérico
        <div className="space-y-2">
          {/* Primera fila - números */}
          <div className="flex gap-2 justify-center">
            {numbersRow1.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="bg-white hover:bg-gray-100 active:bg-gray-300 text-gray-800 font-bold py-6 px-8 rounded-lg text-4xl min-w-[80px] transition-colors shadow"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Segunda fila - controles */}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={onBackspace}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-12 rounded-lg text-2xl flex-1 transition-colors shadow"
            >
              ⌫ Borrar
            </button>

            <button
              type="button"
              onClick={onClear}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-6 px-12 rounded-lg text-2xl flex-1 transition-colors shadow"
            >
              Limpiar
            </button>

            {showEnter && onEnter && (
              <button
                type="button"
                onClick={onEnter}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-6 px-12 rounded-lg text-2xl flex-1 transition-colors shadow"
              >
                ✓ Enter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
