import Layout from '../common/Layout';
import UserList from '../features/user/UserList';

interface UserPageProps {
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onModuleClick?: (moduleId: string) => void;
}

export default function UserPage({
  logoText = "Fe-SCO",
  logoImage,
  userName = "Usuario",
  userEmail = "usuario@ejemplo.com",
  onLogout,
  onModuleClick
}: UserPageProps) {
  return (
    <Layout 
      logoText={logoText}
      logoImage={logoImage}
      userName={userName}
      userEmail={userEmail}
      activeModule="users"
      onModuleClick={onModuleClick}
      onLogout={onLogout}
    >
      <UserList 
        onEdit={(user) => console.log('Editar usuario:', user)}
        onDelete={(id) => console.log('Eliminar usuario:', id)}
        onAdd={() => console.log('Agregar nuevo usuario')}
      />
    </Layout>
  );
}