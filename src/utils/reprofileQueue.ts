import type { Application } from '@/types/application';

export type ReprofileQueueItem = {
    account: string;
    status: 'ACTIVE' | 'WAITING' | 'FAILED' | 'COMPLETED';
    order: number;
};

export function splitReprofileAccounts(value: string): string[] {
    if (!value || value === 'null' || value === 'undefined') return [];
    return value
        .split(/[|,]/)
        .map(account => account.trim())
        .filter(Boolean)
        .filter(account => account.toLowerCase() !== 'null' && account.toLowerCase() !== 'undefined')
        .filter((account, index, accounts) => accounts.findIndex(a => a.toLowerCase() === account.toLowerCase()) === index);
}

export function buildReprofileQueue(accounts: string[], activeAccount?: string): ReprofileQueueItem[] {
    const normalizedAccounts = accounts.filter(Boolean);
    const active = activeAccount && normalizedAccounts.some(a => a.toLowerCase() === activeAccount.toLowerCase())
        ? activeAccount
        : normalizedAccounts[0];

    return normalizedAccounts.map((account, index) => ({
        account,
        status: account.toLowerCase() === active?.toLowerCase() ? 'ACTIVE' : 'WAITING',
        order: index
    }));
}

export function getReprofileQueue(app: Application): ReprofileQueueItem[] {
    const metadataQueue = app.metadata?.reprofile_accounts;
    if (Array.isArray(metadataQueue) && metadataQueue.length > 0) {
        return metadataQueue
            .map((item: any, index: number) => {
                const accountVal = String(item.account || item.new_account || '').trim();
                return {
                    account: accountVal === 'null' || accountVal === 'undefined' ? '' : accountVal,
                    status: (item.status || (index === 0 ? 'ACTIVE' : 'WAITING')) as ReprofileQueueItem['status'],
                    order: typeof item.order === 'number' ? item.order : index
                };
            })
            .filter(item => item.account)
            .sort((a, b) => a.order - b.order);
    }

    const history = app.pis?.reprofile_history || app.metadata?.reprofile_history || [];
    const latest = Array.isArray(history) ? history[history.length - 1] : null;
    
    let initialAssignment = app.pis?.initial_account_assignment || app.metadata?.initial_account_assignment || '';
    if (initialAssignment === 'null' || initialAssignment === 'undefined') {
        initialAssignment = '';
    }
    
    const rawAccountsInput = String(latest?.new_account || initialAssignment);
    const historicalAccounts = Array.isArray(latest?.accounts)
        ? latest.accounts.filter((a: any) => a && a !== 'null' && a !== 'undefined')
        : splitReprofileAccounts(rawAccountsInput);

    let activeFallback = latest?.active_account || app.department || '';
    if (activeFallback === 'null' || activeFallback === 'undefined') {
        activeFallback = '';
    }

    return buildReprofileQueue(historicalAccounts, activeFallback);
}

export function getActiveReprofileAccount(app: Application): string {
    const queue = getReprofileQueue(app);
    const active = queue.find(item => item.status === 'ACTIVE')?.account || queue[0]?.account || app.department || '';
    if (!active || active === 'null' || active === 'undefined') return '';
    return active;
}

export function failActiveReprofileAccount(queue: ReprofileQueueItem[]): ReprofileQueueItem[] {
    const activeIndex = queue.findIndex(item => item.status === 'ACTIVE');
    if (activeIndex === -1) return queue;

    const nextWaitingIndex = queue.findIndex((item, index) => index > activeIndex && item.status === 'WAITING');
    const fallbackWaitingIndex = nextWaitingIndex === -1
        ? queue.findIndex(item => item.status === 'WAITING')
        : nextWaitingIndex;

    return queue.map((item, index) => {
        if (index === activeIndex) return { ...item, status: 'FAILED' };
        if (index === fallbackWaitingIndex) return { ...item, status: 'ACTIVE' };
        return item;
    });
}
export function completeActiveReprofileAccount(queue: ReprofileQueueItem[]): ReprofileQueueItem[] {
    const activeIndex = queue.findIndex(item => item.status === 'ACTIVE');
    if (activeIndex === -1) return queue;

    return queue.map((item, index) => {
        if (index === activeIndex) return { ...item, status: 'COMPLETED' };
        return item;
    });
}
