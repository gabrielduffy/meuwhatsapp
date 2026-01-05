import { io, Socket } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(API_BASE_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Conectado ao servidor');

            // Re-entrar em salas se necessário
            const empresaData = localStorage.getItem('empresa_data');
            if (empresaData) {
                const empresa = JSON.parse(empresaData);
                this.socket?.emit('entrar_empresa', empresa.id);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('[Socket] Desconectado');
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket | null {
        if (!this.socket) {
            return this.connect() || null;
        }
        return this.socket;
    }

    joinConversa(conversaId: string) {
        this.socket?.emit('entrar_conversa', conversaId);
    }

    leaveConversa(conversaId: string) {
        this.socket?.emit('sair_conversa', conversaId);
    }
}

export const socketService = new SocketService();
export default socketService;
