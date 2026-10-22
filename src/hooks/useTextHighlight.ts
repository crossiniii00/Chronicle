import { useEffect, useRef } from 'react';

/**
 * Hook to highlight text in the DOM safely without breaking React,
 * by traversing text nodes and wrapping matches in a styled `<mark>` tag.
 */
export function useTextHighlight(
    containerRef: React.RefObject<any>,
    searchQuery: string,
    isActive: boolean,
    onHighlightsChange?: (matches: { id: string, text: string, element: HTMLElement }[]) => void
) {
    const highlightElementsRef = useRef<HTMLElement[]>([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // 1. Clean up old highlights
        const cleanup = () => {
            highlightElementsRef.current.forEach(mark => {
                const parent = mark.parentNode;
                if (parent) {
                    // Replace <mark> with its text content
                    const text = document.createTextNode(mark.textContent || '');
                    parent.replaceChild(text, mark);
                    // Normalize to merge adjacent text nodes
                    parent.normalize();
                }
            });
            highlightElementsRef.current = [];
            if (onHighlightsChange) {
                onHighlightsChange([]);
            }
        };

        cleanup();

        if (!isActive || !searchQuery || searchQuery.trim().length === 0) {
            return;
        }

        const queryStr = searchQuery.trim().toLowerCase();
        if (queryStr.length < 2) return; // Prevent highlighting single characters for performance

        // 2. Collect text nodes to search (we must collect them first to avoid infinite loops during mutation)
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip if parent is already a mark, script, or style
                    const parent = node.parentElement;
                    if (parent) {
                        const tag = parent.tagName.toLowerCase();
                        if (tag === 'mark' || tag === 'script' || tag === 'style' || tag === 'noscript') {
                            return NodeFilter.FILTER_REJECT;
                        }
                    }
                    if (node.nodeValue && node.nodeValue.toLowerCase().includes(queryStr)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let node;
        while ((node = walker.nextNode())) {
            textNodes.push(node as Text);
        }

        // 3. Highlight text nodes
        const matches: { id: string, text: string, element: HTMLElement }[] = [];
        let matchCounter = 0;

        textNodes.forEach(textNode => {
            let parent = textNode.parentNode;
            if (!parent) return;

            let currentTextNode = textNode;
            
            // Loop to find all matches within this single text node
            while (true) {
                const content = currentTextNode.nodeValue || '';
                const lowerContent = content.toLowerCase();
                let startIndex = lowerContent.indexOf(queryStr);
                
                if (startIndex === -1) break;
                
                // Split the text node
                const middleNode = currentTextNode.splitText(startIndex);
                const remainderNode = middleNode.splitText(queryStr.length); // Split again at the end of the match

                // Replace middle node with mark
                const mark = document.createElement('mark');
                mark.className = 'bg-yellow-300 text-yellow-900 rounded-sm px-0.5 font-semibold transition-colors duration-200 shadow-sm border border-yellow-400';
                mark.textContent = middleNode.nodeValue;
                
                parent.replaceChild(mark, middleNode);
                highlightElementsRef.current.push(mark);
                matches.push({ id: `match-${matchCounter++}`, text: middleNode.nodeValue || '', element: mark });
                
                // Continue searching in the remainder of the text
                currentTextNode = remainderNode;
            }
        });

        if (onHighlightsChange) {
            // Debounce or call immediately? It's safe to call immediately here since it's inside useEffect
            onHighlightsChange(matches);
        }

        return cleanup;
    }, [searchQuery, isActive, containerRef]);
}
