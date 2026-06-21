import { ReportConfigRepository } from '../repositories/ReportConfigRepository.js';

export class ReportConfigService {
    static async getConfig(id) {
        return await ReportConfigRepository.findById(id);
    }

    static async getAllConfigs() {
        const configs = await ReportConfigRepository.findAll();
        // Convert array to object for easier consumption
        return configs.reduce((acc, curr) => {
            acc[curr.id] = curr.config_data;
            return acc;
        }, {});
    }

    static async updateConfig(id, data) {
        return await ReportConfigRepository.upsert(id, data);
    }
}
