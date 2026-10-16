import { Functions, httpsCallable } from 'firebase/functions';
import { SafetyReportsGateway } from '../../core/ports/safetyReports';

export class FirebaseSafetyReports implements SafetyReportsGateway {
  constructor(private readonly functions: Functions) {}
  private async call<T>(name: string, data: unknown): Promise<T> {
    return (await httpsCallable<unknown, T>(this.functions, name)(data)).data;
  }
  submit(data: Parameters<SafetyReportsGateway['submit']>[0]) {
    return this.call<Awaited<ReturnType<SafetyReportsGateway['submit']>>>(
      'submitSafetyReport',
      data,
    );
  }
  list(data: Parameters<SafetyReportsGateway['list']>[0]) {
    return this.call<Awaited<ReturnType<SafetyReportsGateway['list']>>>(
      'listSafetyReports',
      data,
    );
  }
  update(data: Parameters<SafetyReportsGateway['update']>[0]) {
    return this.call<Awaited<ReturnType<SafetyReportsGateway['update']>>>(
      'updateSafetyReport',
      data,
    );
  }
  async moderate(data: Parameters<SafetyReportsGateway['moderate']>[0]) {
    await this.call('moderateSafetyReport', data);
  }
}
