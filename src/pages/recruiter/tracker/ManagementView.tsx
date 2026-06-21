import { useSearchParams } from 'react-router-dom';
import { ApplicantManagement } from '../ApplicantManagement';

export function ManagementView() {
    const [searchParams] = useSearchParams();
    const tab = (searchParams.get('tab') || 'ongoing') as any;
    
    return <ApplicantManagement key={tab} initialTab={tab} mode="full" />;
}
