import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
}

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10,
        scale: 0.99
    },
    animate: {
        opacity: 1,
        y: 0,
        scale: 1
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 1.01
    }
};

const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.5
};

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={pageTransition}
            style={{ width: '100%', height: '100%' }}
        >
            {children}
        </motion.div>
    );
}
