import { useSearchParams } from 'react-router-dom';
import { ApplicantManagement } from '../ApplicantManagement';

export function ManagementView() {
    const [searchParams] = useSearchParams();
    const tab = (searchParams.get('tab') || 'all_tab') as any;
    
    return <ApplicantManagement key={tab} initialTab={tab} mode="full" />;
}
