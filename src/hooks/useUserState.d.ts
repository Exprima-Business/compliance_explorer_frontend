import type { UserStateResponse } from '../services/userStateService';
interface UseUserStateReturn {
    userState: UserStateResponse | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}
export declare const useUserState: () => UseUserStateReturn;
export {};
