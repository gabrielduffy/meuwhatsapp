import { FileText } from 'lucide-react';
import api from '../services/api';

export default function Documentacao() {
    // A URL da documentação é servida pelo backend na rota /api-docs
    const docUrl = api.defaults.baseURL ? `${api.defaults.baseURL}/api-docs` : '/api-docs';

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-600" />
                    <h1 className="text-xl font-bold dark:text-white">Documentação da API (Swagger)</h1>
                </div>
                <a
                    href={docUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                    Abrir em Nova Aba
                </a>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <iframe
                    src={docUrl}
                    title="Swagger UI"
                    className="w-full h-full border-none"
                />
            </div>
        </div>
    );
}
