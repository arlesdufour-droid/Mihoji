import { assertE2eEnvironment, loadEnv } from './e2e-guard';

loadEnv();
assertE2eEnvironment();
console.log('Environnement e2e valide : développement.');
