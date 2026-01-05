import { useState } from 'react';
import {
    CheckCircle,
    HelpCircle,
    Info,
    Activity,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ServiceStatus {
    id: string;
    name: string;
    uptime: string;
    status: 'operational' | 'degraded' | 'outage';
    history: ('green' | 'red' | 'blue')[];
}

export default function Status() {
    const [lastUpdate] = useState(new Date());

    const generateHistory = (outageChance: number) => {
        return Array.from({ length: 90 }).map(() => {
            const rand = Math.random();
            if (rand < outageChance) return 'red';
            if (rand < outageChance + 0.05) return 'blue';
            return 'green';
        });
    };

    const services: ServiceStatus[] = [
        {
            id: 'instancias',
            name: 'Instâncias WhatsApp',
            uptime: '100.000%',
            status: 'operational',
            history: generateHistory(0.001)
        },
        {
            id: 'chat',
            name: 'Chat Interno',
            uptime: '99.998%',
            status: 'operational',
            history: generateHistory(0.002)
        },
        {
            id: 'automacao',
            name: 'Automação IA',
            uptime: '99.666%',
            status: 'operational',
            history: generateHistory(0.012)
        },
        {
            id: 'kanban',
            name: 'CRM / Kanban',
            uptime: '99.996%',
            status: 'operational',
            history: generateHistory(0.001)
        },
        {
            id: 'servidor',
            name: 'Servidor Geral',
            uptime: '100.000%',
            status: 'operational',
            history: generateHistory(0)
        },
        {
            id: 'latencia',
            name: 'Latência da API',
            uptime: '99.767%',
            status: 'operational',
            history: generateHistory(0.008)
        }
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFF] font-sans text-[#1A1A1A] selection:bg-purple-100">
            {/* Top Navbar */}
            <nav className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity className="w-6 h-6 text-[#00C292]" />
                    <span className="font-bold text-xl tracking-tight text-[#1A1A1A]">whatsbenemax</span>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <button className="text-[13px] font-semibold text-[#1A1A1A] px-3 py-1.5 bg-[#F4F4F7] rounded-md">Status</button>
                    <button className="text-[13px] font-semibold text-[#6E6E73] hover:text-[#1A1A1A] transition-colors">Manutenção</button>
                    <button className="text-[13px] font-semibold text-[#6E6E73] hover:text-[#1A1A1A] transition-colors">Incidentes anteriores</button>
                </div>

                <button className="px-4 py-2 rounded-lg border border-[#E5E5E9] text-[13px] font-semibold hover:bg-[#F4F4F7] transition-all">
                    Entre em contato
                </button>
            </nav>

            {/* Main Status Indicator */}
            <header className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-6 inline-flex"
                >
                    <div className="w-8 h-8 bg-[#00C292] rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                </motion.div>

                <h1 className="text-4xl font-bold mb-3">Todos os serviços estão online</h1>
                <p className="text-[#6E6E73] text-[14px]">
                    Última atualização em {lastUpdate.toLocaleDateString('pt-BR', { month: 'long', day: '2-digit' })} às {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} BRT
                </p>
            </header>

            {/* Status Card Content */}
            <main className="max-w-3xl mx-auto px-4 pb-24">
                <div className="bg-white rounded-xl border border-[#E5E5E9] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
                    {/* Card Action Header */}
                    <div className="px-6 py-4 border-b border-[#F0F0F3] flex justify-end">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F1F9F6] border border-[#D1E9E0] rounded-full">
                            <CheckCircle className="w-3.5 h-3.5 text-[#00C292]" />
                            <span className="text-[12px] font-bold text-[#00C292]">Operacional</span>
                            <HelpCircle className="w-3 h-3 text-[#A0A0A5] ml-1" />
                        </div>
                    </div>

                    {/* List of components */}
                    <div className="p-10 space-y-12">
                        {services.map((service) => (
                            <div key={service.id} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-[#00C292]" />
                                        <h3 className="text-[14px] font-bold text-[#1A1A1A]">
                                            {service.name}
                                        </h3>
                                        <HelpCircle className="w-3.5 h-3.5 text-[#D0D0D5] cursor-help" />
                                    </div>
                                    <div className="text-[12px] font-bold text-[#00C292]">
                                        {service.uptime} uptime
                                    </div>
                                </div>

                                {/* The thin vertical bars for 90 days history */}
                                <div className="flex items-center gap-[1.5px] h-9">
                                    {service.history.map((day, dIdx) => (
                                        <div
                                            key={dIdx}
                                            className={`flex-1 h-full rounded-[1px] ${day === 'green' ? 'bg-[#00C292]' :
                                                    day === 'red' ? 'bg-[#FF4D4D]' : 'bg-[#4DA3FF]'
                                                }`}
                                        />
                                    ))}
                                </div>

                                <div className="flex items-center justify-between text-[11px] font-semibold text-[#A0A0A5]">
                                    <span>90 dias atrás</span>
                                    <span>Hoje</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer info */}
                <div className="mt-20 text-center text-[12px] text-[#A0A0A5] font-medium flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span>Desenvolvido por</span>
                        <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-[#6E6E73] grayscale" />
                            <span className="font-bold text-[#6E6E73]">whatsbenemax</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
