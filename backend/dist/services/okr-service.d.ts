import { OKR, OKRProgress, OKRDashboardData } from '../types/okr.js';
export declare class OKRService {
    private logError;
    private logInfo;
    createOKR(okrData: Partial<OKR>): Promise<OKR>;
    getOKR(id: string): Promise<OKR | null>;
    getAllOKRs(ownerId?: string): Promise<OKR[]>;
    updateProgress(okrId: string, newProgress: number, source: OKRProgress['source'], details?: any): Promise<OKRProgress>;
    calculateRICEScore(okr: OKR): OKR['ricePriority'];
    private getDaysUntilDue;
    private generateProgressAlerts;
    getDashboardData(ownerId?: string): Promise<OKRDashboardData>;
    generateInitialData(): Promise<void>;
}
export declare const okrService: OKRService;
//# sourceMappingURL=okr-service.d.ts.map