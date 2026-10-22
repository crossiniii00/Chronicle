const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    "const toggleSelect = (id: string, forceMode?: 'select' | 'deselect') => {",
    "const toggleSelect = useCallback((id: string, forceMode?: 'select' | 'deselect') => {"
);

code = code.replace(
    "            return next;\n        });\n    };",
    "            return next;\n        });\n    }, []);"
);

fs.writeFileSync(path, code);
console.log('Wrapped toggleSelect in useCallback');
