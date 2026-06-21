import { useState, useMemo } from 'react';
import { SALARY_DATA, type AccountSalary } from '../constants/salaryConstants';

export function useSalaryReference() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<AccountSalary | null>(null);

    const filteredAccounts = useMemo(() => {
        if (!searchTerm) return SALARY_DATA;
        const s = searchTerm.toLowerCase();
        return SALARY_DATA.filter(acc =>
            acc.account.toLowerCase().includes(s) ||
            acc.tiers.some(t =>
                t.name.toLowerCase().includes(s) ||
                t.entries.some(e =>
                    e.position.toLowerCase().includes(s) ||
                    e.experience.toLowerCase().includes(s)
                )
            )
        );
    }, [searchTerm]);

    return {
        searchTerm,
        setSearchTerm,
        selectedAccount,
        setSelectedAccount,
        filteredAccounts
    };
}
