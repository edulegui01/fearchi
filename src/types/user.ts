// Tipos para usuarios
export interface User {
  nombre: string;
  apellido: string;
  cedula: string;
}

// Props para componentes que manejan usuarios
export interface UserProps {
  userName?: string;
  cedula?: string;
}