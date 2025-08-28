import { useState } from 'react';
import UserForm from './UserForm';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface UserListProps {
  users?: User[];
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
  onAdd?: () => void;
}

const defaultUsers: User[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@empresa.com',
    role: 'Administrador',
    status: 'active',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@empresa.com',
    role: 'Usuario',
    status: 'active',
    createdAt: '2024-02-10'
  },
  {
    id: '3',
    name: 'Carlos López',
    email: 'carlos@empresa.com',
    role: 'Editor',
    status: 'inactive',
    createdAt: '2024-01-28'
  },
  {
    id: '4',
    name: 'Ana Martínez',
    email: 'ana@empresa.com',
    role: 'Usuario',
    status: 'active',
    createdAt: '2024-03-05'
  },
  {
    id: '5',
    name: 'Pedro Rodríguez',
    email: 'pedro@empresa.com',
    role: 'Editor',
    status: 'active',
    createdAt: '2024-02-20'
  }
];

export default function UserList({
  users = defaultUsers,
  onEdit,
  onDelete,
  onAdd
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userList, setUserList] = useState<User[]>(users);

  const filteredUsers = userList.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsFormVisible(true);
    onEdit?.(user);
  };

  const handleDelete = (userId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      setUserList(prev => prev.filter(user => user.id !== userId));
      onDelete?.(userId);
    }
  };

  const handleAdd = () => {
    setSelectedUser(null);
    setIsFormVisible(true);
    onAdd?.();
  };

  const handleSaveUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    if (selectedUser) {
      // Editar usuario existente
      setUserList(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...userData }
          : user
      ));
    } else {
      // Crear nuevo usuario
      const newUser: User = {
        id: (userList.length + 1).toString(),
        ...userData,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUserList(prev => [...prev, newUser]);
    }
    setIsFormVisible(false);
    setSelectedUser(null);
  };

  const handleCancelForm = () => {
    setIsFormVisible(false);
    setSelectedUser(null);
  };

  const getStatusBadge = (status: User['status']) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Activo
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Inactivo
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      'Administrador': 'bg-purple-100 text-purple-800',
      'Editor': 'bg-blue-100 text-blue-800',
      'Usuario': 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-600">Gestiona los usuarios del sistema</p>
        </div>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-primary-600 hover:text-primary-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-primary-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900 inline-flex items-center px-3 py-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500">
        Mostrando {filteredUsers.length} de {userList.length} usuarios
      </div>

      {/* User Form Modal */}
      <UserForm
        user={selectedUser}
        isVisible={isFormVisible}
        onSave={handleSaveUser}
        onCancel={handleCancelForm}
      />
    </div>
  );
}