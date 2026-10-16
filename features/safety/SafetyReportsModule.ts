import { IdGenerator } from '../../core/domain';
import { SafetyReportsGateway } from '../../core/ports/safetyReports';

export class SafetyReportsModule implements SafetyReportsGateway {
  constructor(
    private readonly gateway: SafetyReportsGateway | undefined,
    private readonly ids: IdGenerator,
  ) {}
  newRequestId() {
    return this.ids.next();
  }
  private get service() {
    if (!this.gateway)
      throw new Error('Safety reporting is unavailable in this environment');
    return this.gateway;
  }
  async submit(data: Parameters<SafetyReportsGateway['submit']>[0]) {
    return this.service.submit(data);
  }
  async list(data: Parameters<SafetyReportsGateway['list']>[0]) {
    return this.service.list(data);
  }
  async update(data: Parameters<SafetyReportsGateway['update']>[0]) {
    return this.service.update(data);
  }
  async moderate(data: Parameters<SafetyReportsGateway['moderate']>[0]) {
    return this.service.moderate(data);
  }
}
