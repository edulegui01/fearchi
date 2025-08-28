import scoLogo from '../../assets/sco-logo.png';

interface WelcomeScreenProps {
  onContinue?: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-primary-400 flex items-center justify-center">
      <div className="flex justify-center bg-secondary-100 p-10 rounded-lg shadow-lg">
        <img 
          src={scoLogo} 
          alt="Fe-SCO"
          className="h-64 w-auto"
        />
      </div>
    </div>
  );
}