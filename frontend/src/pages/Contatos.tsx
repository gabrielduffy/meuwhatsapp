import { useState, useEffect } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import api from '../services/api';

interface Contact {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
}

export default function Contatos() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data } = await api.get('/api/contatos');
      setContacts(data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Contatos</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg">
          <Plus className="w-5 h-5" />
          Novo Contato
        </button>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contatos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-white/10 rounded-lg text-white"
          />
        </div>
      </div>

      <div className="bg-gray-900/50 border border-white/10 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Telefone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-white/80">Email</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-4 py-3 text-white">{contact.nome}</td>
                <td className="px-4 py-3 text-white/60">{contact.telefone}</td>
                <td className="px-4 py-3 text-white/60">{contact.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
