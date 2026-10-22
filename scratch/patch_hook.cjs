const fs = require('fs');
const path = 'c:/Users/cp360admin/Downloads/ChronicleV7/ChronicleV7/src/pages/recruiter/applicant-management/hooks/useApplicantManagement.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
    'const [statusFilter, setStatusFilter] = useState(initialStatusFilter);',
    `const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [taggingFilter, setTaggingFilter] = useState<string[]>([]);
    const [lobFilter, setLobFilter] = useState<string[]>([]);
    const [specialStatusFilter, setSpecialStatusFilter] = useState<string[]>([]);
    const [hireTypeFilter, setHireTypeFilter] = useState<string[]>([]);
    const [recruiterFilter, setRecruiterFilter] = useState<string[]>([]);
    const [appliedDateFilter, setAppliedDateFilter] = useState<any>({ type: 'ALL', start: '', end: '' });
    const [interviewDateFilter, setInterviewDateFilter] = useState<any>({ type: 'ALL', start: '', end: '' });
    const [trainingDateFilter, setTrainingDateFilter] = useState<any>({ type: 'ALL', start: '', end: '' });
    const [dateFilter, setDateFilter] = useState<any>({ type: 'ALL', start: '', end: '' });
    const [dateTargetFilter, setDateTargetFilter] = useState<string>('APPLIED_DATE');
    const [isIdleFilterActive, setIsIdleFilterActive] = useState<boolean>(false);
    const accountToLobsMap = useMemo(() => ({}), []);
    const handleBulkUpdate = async (tag: string) => {};`
);

code = code.replace(
    "const [accountFilter, setAccountFilter] = useState('ALL');",
    "const [accountFilter, setAccountFilter] = useState<string[]>([]);"
);

code = code.replace(
    "handleUpdateApplication, confirmDelete, handleBulkDelete,",
    `handleUpdateApplication, confirmDelete, handleBulkDelete, handleBulkUpdate,
        taggingFilter, setTaggingFilter,
        lobFilter, setLobFilter,
        accountToLobsMap,
        accountFilter, setAccountFilter,
        specialStatusFilter, setSpecialStatusFilter,
        hireTypeFilter, setHireTypeFilter,
        recruiterFilter, setRecruiterFilter,
        appliedDateFilter, setAppliedDateFilter,
        interviewDateFilter, setInterviewDateFilter,
        trainingDateFilter, setTrainingDateFilter,
        dateFilter, setDateFilter,
        dateTargetFilter, setDateTargetFilter,
        isIdleFilterActive, setIsIdleFilterActive,`
);

fs.writeFileSync(path, code);
console.log('Patched');
