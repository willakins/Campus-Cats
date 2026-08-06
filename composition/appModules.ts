import { createAppModules } from './createAppModules';
import { createAppInfrastructure } from './infrastructure';

export type { AppInfrastructure, AppModules } from './createAppModules';
export { createAppModules } from './createAppModules';

export const appModules = createAppModules(createAppInfrastructure());
