import dns from 'dns';
import { query } from '../db.js';

const reverseDns = (ip) => {
    return new Promise((resolve) => {
        if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
            resolve('localhost');
            return;
        }
        const cleanIp = ip.replace(/^::ffff:/, '');
        dns.reverse(cleanIp, (err, hostnames) => {
            if (err || !hostnames || hostnames.length === 0) {
                resolve(null);
            } else {
                resolve(hostnames[0]);
            }
        });
    });
};

const getDeviceDetails = (ua) => {
    if (!ua) return 'Unknown Device';
    if (ua.includes('Windows NT')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Linux')) return 'Linux PC';
    return 'Other Device';
};

export async function writeAuditLog({
    userId = null,
    action,
    resourceType = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    metadata = {},
    success = true,
}) {
    let computerName = 'Unknown Host';
    try {
        const resolved = await reverseDns(ipAddress);
        if (resolved) {
            computerName = resolved;
        }
    } catch (e) {
        // ignore
    }

    const deviceName = getDeviceDetails(userAgent);
    const enrichedMetadata = {
        ...metadata,
        computerName,
        deviceName
    };

    await query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, success)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, action, resourceType, resourceId, ipAddress, userAgent, JSON.stringify(enrichedMetadata), success]
    );
}
