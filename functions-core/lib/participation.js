"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParticipationAudience = parseParticipationAudience;
exports.assertCanParticipate = assertCanParticipate;
const handlers_1 = require("./handlers");
function parseParticipationAudience(value) {
    if (value === undefined || value === 'all_members')
        return 'all_members';
    if (value === 'officers_only')
        return 'officers_only';
    throw new handlers_1.HandlerError('internal', 'Stored participation audience is invalid');
}
function assertCanParticipate(audienceValue, role, subject) {
    const audience = parseParticipationAudience(audienceValue);
    if (audience === 'officers_only' && role < 1) {
        throw new handlers_1.HandlerError('permission-denied', `Only officers can participate in this ${subject}`);
    }
}
//# sourceMappingURL=participation.js.map