import { useContext } from 'react';
import { LoadingContext } from '@/components/common/GlobalLoading';

export function useLoading() {
    return useContext(LoadingContext);
}
