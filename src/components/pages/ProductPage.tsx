import Layout from '../common/Layout';
import ProductList from '../features/product/ProductList';

interface ProductPageProps {
  logoText?: string;
  logoImage?: string;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onModuleClick?: (moduleId: string) => void;
}

export default function ProductPage({
  logoText = "Fe-SCO",
  logoImage,
  userName = "Usuario",
  userEmail = "usuario@ejemplo.com",
  onLogout,
  onModuleClick
}: ProductPageProps) {
  return (
    <Layout 
      logoText={logoText}
      logoImage={logoImage}
      userName={userName}
      userEmail={userEmail}
      activeModule="products"
      onModuleClick={onModuleClick}
      onLogout={onLogout}
    >
      <ProductList 
        onEdit={(product) => console.log('Editar producto:', product)}
        onDelete={(id) => console.log('Eliminar producto:', id)}
        onAdd={() => console.log('Agregar nuevo producto')}
      />
    </Layout>
  );
}