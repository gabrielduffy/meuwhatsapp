import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type BlockType = 'text' | 'image' | 'button' | 'spacer' | 'divider' | 'video' | 'header' | 'footer';

export interface EmailBlock {
    id: string;
    type: BlockType;
    content: any;
    styles: {
        paddingTop: number;
        paddingBottom: number;
        paddingLeft: number;
        paddingRight: number;
        marginTop: number;
        marginBottom: number;
        backgroundColor: string;
        textAlign?: 'left' | 'center' | 'right' | 'justify';
        color?: string;
        fontSize?: number;
        fontWeight?: string;
        fontFamily?: string;
        lineHeight?: number;
        letterSpacing?: number;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: string;
        borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
        width?: string;
        maxWidth?: string;
    };
}


interface BuilderState {
    blocks: EmailBlock[];
    selectedBlockId: string | null;
    addBlock: (type: BlockType, index?: number) => void;
    removeBlock: (id: string) => void;
    updateBlock: (id: string, updates: Partial<EmailBlock>) => void;
    setSelectedBlockId: (id: string | null) => void;
    moveBlock: (fromIndex: number, toIndex: number) => void;
    setBlocks: (blocks: EmailBlock[]) => void;
}

export const useEmailBuilder = create<BuilderState>((set) => ({
    blocks: [],
    selectedBlockId: null,

    addBlock: (type, index) => set((state) => {
        const newBlock: EmailBlock = {
            id: uuidv4(),
            type,
            content: getDefaultContent(type),
            styles: getDefaultStyles(type),
        };

        const newBlocks = [...state.blocks];
        if (typeof index === 'number') {
            newBlocks.splice(index, 0, newBlock);
        } else {
            newBlocks.push(newBlock);
        }

        return { blocks: newBlocks, selectedBlockId: newBlock.id };
    }),

    removeBlock: (id) => set((state) => ({
        blocks: state.blocks.filter((b) => b.id !== id),
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
    })),

    updateBlock: (id, updates) => set((state) => ({
        blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

    setSelectedBlockId: (id) => set({ selectedBlockId: id }),

    moveBlock: (fromIndex, toIndex) => set((state) => {
        const result = [...state.blocks];
        const [removed] = result.splice(fromIndex, 1);
        result.splice(toIndex, 0, removed);
        return { blocks: result };
    }),

    setBlocks: (blocks) => set({ blocks }),
}));

function getDefaultContent(type: BlockType) {
    switch (type) {
        case 'text': return { html: '<p>Novo texto aqui...</p>' };
        case 'image': return { url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000', alt: 'Image', link: '' };
        case 'button': return { text: 'Clique Aqui', url: '#' };
        case 'header': return { logoUrl: '', title: 'Sua Marca' };
        case 'video': return { url: '', thumbnail: '', platform: 'youtube' };
        case 'divider': return { color: '#e2e8f0', height: 1 };
        default: return {};
    }
}

function getDefaultStyles(type: BlockType) {
    const base = {
        paddingTop: 20,
        paddingBottom: 20,
        paddingLeft: 20,
        paddingRight: 20,
        marginTop: 0,
        marginBottom: 0,
        backgroundColor: 'transparent',
        borderStyle: 'none' as const,
        fontFamily: 'Inter, sans-serif',
    };

    if (type === 'button') {
        return {
            ...base,
            textAlign: 'center' as const,
            color: '#ffffff',
            backgroundColor: '#8B5CF6',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 16,
            width: 'auto'
        };
    }

    if (type === 'text') {
        return { ...base, color: '#111827', fontSize: 16, lineHeight: 1.5 };
    }

    if (type === 'header') {
        return { ...base, backgroundColor: '#ffffff', textAlign: 'left' as const };
    }

    return base;
}

