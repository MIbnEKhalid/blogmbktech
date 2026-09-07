import { activityLogRepository } from '../repositories/index.js';

export async function initializeAdminTables() {
    return activityLogRepository.initializeAdminTables();
}

// Auto-run initialization on load
initializeAdminTables();

export async function logActivity({ action, entityType, entityId = null, entityTitle = null, details = null, username = 'admin' }) {
    return activityLogRepository.logActivity({ action, entityType, entityId, entityTitle, details, username });
}
