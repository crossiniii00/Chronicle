import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
    id: string;
    children: ReactNode;
}

export function Portal({ id, children }: PortalProps) {
    const el = document.getElementById(id);
    if (!el) return null;
    return createPortal(children, el);
}
