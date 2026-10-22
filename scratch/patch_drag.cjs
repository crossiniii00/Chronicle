const fs = require('fs');
const file = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/tracker/masterlist/components/MasterlistTable.tsx';
let data = fs.readFileSync(file, 'utf8');

// Insert draggedColIndex state
if (!data.includes('draggedColIndex')) {
    data = data.replace('const [showHiddenColsModal, setShowHiddenColsModal] = React.useState(false);', 
        'const [showHiddenColsModal, setShowHiddenColsModal] = React.useState(false);\n    const [draggedColIndex, setDraggedColIndex] = React.useState<number | null>(null);');
}

// Insert handleDragDropColumn function
if (!data.includes('handleDragDropColumn')) {
    const dragFn = 
    const handleDragDropColumn = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        
        const colA = columns[fromIndex];
        const colB = columns[toIndex];
        if (!colA || !colB) return;

        const updated = [...rawColumns];
        const rawIdxA = updated.findIndex(c => getColumnKey(c) === getColumnKey(colA));
        const rawIdxB = updated.findIndex(c => getColumnKey(c) === getColumnKey(colB));
        
        if (rawIdxA === -1 || rawIdxB === -1) return;
        
        const [movedCol] = updated.splice(rawIdxA, 1);
        const targetIdx = updated.findIndex(c => getColumnKey(c) === getColumnKey(colB));
        const finalInsertIdx = fromIndex < toIndex ? targetIdx + 1 : targetIdx;
        
        updated.splice(finalInsertIdx, 0, movedCol);

        const newCustom = {
            ...customColumns,
            [activeTabKey]: updated
        };
        setCustomColumns(newCustom);
    };
;
    data = data.replace('const handleMoveColumn = (indexInFiltered: number, direction: \\'left\\' | \\'right\\') => {', 
        dragFn + '\\n    const handleMoveColumn = (indexInFiltered: number, direction: \\'left\\' | \\'right\\') => {');
}

// Add draggable props to th
if (!data.includes('draggable={isConfigEditing}')) {
    const thStart = 'style={{';
    const dragProps = draggable={isConfigEditing}
                                            onDragStart={(e) => {
                                                if (!isConfigEditing) return;
                                                setDraggedColIndex(idx);
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', idx.toString());
                                            }}
                                            onDragOver={(e) => {
                                                if (!isConfigEditing) return;
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = 'move';
                                            }}
                                            onDrop={(e) => {
                                                if (!isConfigEditing || draggedColIndex === null) return;
                                                e.preventDefault();
                                                handleDragDropColumn(draggedColIndex, idx);
                                                setDraggedColIndex(null);
                                            }}
                                            onDragEnd={() => setDraggedColIndex(null)}
                                            ;
    
    // We only want to replace the FIRST occurrence of style={{ in the th mapping
    // But there are multiple th's. The first one in the columns map is what we need.
    // Let's use a regex to find the right th
    data = data.replace(/onContextMenu=\{\(e\) \=\> \{\s+e\.preventDefault\(\);\s+e\.stopPropagation\(\);\s+const rect \= e\.currentTarget\.getBoundingClientRect\(\);\s+setActiveColumnMenu\(\{\s+colName\: displayLabel,\s+colKey,\s+x\: rect\.left,\s+y\: rect\.bottom\s+\}\);\s+\}\}\s+style=\{\{/, (match) => {
        return match.replace('style={{', dragProps + 'style={{');
    });
}

fs.writeFileSync(file, data);
